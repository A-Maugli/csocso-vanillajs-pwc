"use strict";

//const algod = require('algosdk');
//const pwcsdk = require('@perawallet/connect');
//const $ = require('jquery');

const ver = "0.2.12"; // Use PeraWalletConnect(); 

/* Algonode.io API */
const baseServer = "https://testnet-api.algonode.cloud";
const baseServerIdx = "https://testnet-idx.algonode.cloud";
const port = 443;
const token = "";

const working = "Working";
const ready = "Ready";
var addr_src, addr_dst;
var account_addr = '';  // address selected on PeraWallet

const testing = false;
if (testing) {
  debugger;
  addr_src = 'CDRLCYZICK7XEBZ7M4HKYWNB7ZZLO4BFOQ5RGZNMHQ5ZH7EZWUDFQ6Z32U';  // Test account 1
  addr_dst = 'UUOB7ZC2IEE4A7JO4WY4TXKXWDFNATM43TL73IZRAFIFFOE6ORPKC7Q62E';
}
else {
  addr_src = 'JW6L2ZCQT3UIQH5AFM3CVW3C7M3QFYHXA3EU4WHREOATRWMXP6MBFNKILM';  // Csocsó account
  addr_dst = 'UUOB7ZC2IEE4A7JO4WY4TXKXWDFNATM43TL73IZRAFIFFOE6ORPKC7Q62E';
}

const algod_client = new algosdk.Algodv2(token, baseServer, port);
console.log('algod_client created');
const indexer_client = new algosdk.Indexer(token, baseServerIdx, port);
console.log('indexer_client created');

const pwcsdk = pwc.pwcsdk;
const peraWallet = new pwcsdk.PeraWalletConnect();
console.log('peraWallet created');

async function reconnectSessionA() {
  let accounts = await peraWallet.reconnectSession();
  if (peraWallet.connector !== null) {
    peraWallet.connector.on("disconnect", handleDisconnectWalletA);
  }
  return accounts;
}

async function handleConnectWalletA() {
  let newAccounts = await peraWallet.connect();
  peraWallet.connector.on("disconnect", handleDisconnectWalletA);
  return newAccounts;
}

async function handleDisconnectWalletA() {
  await peraWallet.disconnect();
  console.log('Info in handleDisconnectWallet: ', 'disconnected');
  let accountAddress = "";
  return accountAddress;
}

function algo_send_tx(algod_client, note) {
  (async () => {
    // Reconnect/connect wallet
    let accounts = await reconnectSessionA();
    if (accounts.length == 0) {
      accounts = await handleConnectWalletA();
    }
    if (accounts.length == 0) {
      throw ('Wallet connect error');
    }
    if (accounts[0] !== addr_src) {
      await handleDisconnectWalletA();
      throw ('Please connect to ' + addr_src);
    }
    else {
      account_addr = accounts[0];
    }

    //  get params from algod
    let params = await algod_client.getTransactionParams().do();

    let obj = {
      "from": account_addr,
      "to": addr_dst,
      "amount": 1,
      "note": algosdk.encodeObj(note),
      "suggestedParams": params
    };
    let txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(obj);
    // sign transaction
    let txGroup = [{ txn, signers: [account_addr] }];
    let signedTxnGroup = await peraWallet.signTransaction([txGroup]);
    // submit transaction
    let tx = await algod_client.sendRawTransaction(signedTxnGroup).do();
    //console.log("Transaction id: " + tx.txId);
    $('#tx_id').val(tx.txId);
    const waitRounds = 5;
    await algosdk.waitForConfirmation(algod_client, tx.txId, waitRounds);
    $('#send_tx_status').val(ready);
  })().catch(e => {
    console.log(e);
    $('#send_tx_status').val(e);
  });
}

function algo_send_tx_outer() {
  if ($('#send_tx_status').val() !== working) {
    $('#send_tx_status').val(working);
    let game_name = $('#game').val();
    let user1 = $('#user1').val();
    let user2 = $('#user2').val();
    let goal1 = $('#goal1').val();
    let goal2 = $('#goal2').val();
    let ms_since_1970 = (new Date()).valueOf();
    let note = {
      game: game_name,
      user1: user1,
      user2: user2,
      goal1: goal1,
      goal2: goal2,
      date: ms_since_1970
    };
    //console.log("Note: " + JSON.stringify(note));
    algo_send_tx(algod_client, note);
  }
}

function make_list_from_tx(tx) {
  let list = "";
  let num_tx = tx.transactions.length;
  for (let i = 0; i < num_tx; i++) {
    let note1 = { game: "", user1: "", user2: "", goal1: "", goal2: "", date: 0 };
    try {
      if (typeof (tx.transactions[i].note) !== 'undefined') {
        //console.log('i:'+' note:'+ tx.transactions[i].note);
        const buff = Buffer.from(tx.transactions[i].note, 'base64');   // Node.js Buffer.from
        //const buff = base64js.toByteArray(tx.transactions[i].note);
        note1 = algosdk.decodeObj(buff);
      }
    }
    catch (e) {/*alert(e);*/ };

    if ((tx.transactions[i]['tx-type'] === "pay") && (note1.game === "Csocsó") &&
      (note1.goal1 !== undefined) && (note1.goal2 !== undefined)) {
      list += "<li>" + note1.user1 + ' - ' + note1.user2 + ': ' +
        note1.goal1 + ' : ' + note1.goal2;
      list += "&nbsp;&nbsp;&nbsp;";
      list += "\t Round: " + tx.transactions[i]['confirmed-round'];
      list += "&nbsp;&nbsp;&nbsp;";
      list += "\t Fee: " + tx.transactions[i].fee / 1000000.0;
      list += "&nbsp;&nbsp;&nbsp;";
      if (typeof note1.date !== "undefined") {
        list += "&nbsp;&nbsp;&nbsp;";
        let date = new Date(note1.date);
        let date1 = date.toLocaleDateString("hu-HU");
        let time1 = date.toLocaleTimeString("hu-HU");
        list += date1 + " " + time1;
      }
      list += "</li>";
    }
  }
  return list
}


function algo_get_tx() {
  if ($('#get_tx_status').val() !== working) {
    (async () => {
      $('#get_tx_status').val(working);
      $('#game_list').empty();

      let next_token = "";
      let tx_limit = 50;
      let num_tx = 1;
      let list = "";

      while (num_tx > 0) {
        let tx = await indexer_client
          .lookupAccountTransactions(addr_src)
          .limit(tx_limit)
          .nextToken(next_token).do();
        num_tx = tx.transactions.length;
        list += make_list_from_tx(tx);
        next_token = tx['next-token'];
      }
      $('#get_tx_status').val(ready);
      $("#game_list").append(list);
      $("#game_list").show();
    })().catch(e => {
      console.log(e);
    });
  }
}

$(window.document).ready(function () {
  console.log("document ready");
  const game_name = "Csocsó";
  const user1 = "CsG";
  const user2 = "LG";
  $('#game').val(game_name);
  $('#user1').val(user1);
  $('#user2').val(user2);
  $('#goal1').val('0');
  $('#goal2').val('0');
  $('#tx_id').val('');
  $('#send_tx_status').val('');

  $('#game_list').empty();
  $('#get_tx_status').val('');

  $('#store_game_result').on("click", function () {
    console.log("Handler for `Store game result` is called.");
    algo_send_tx_outer();
  });

  $('#read_game_results').on("click", function () {
    console.log("Handler for `Read game results` is called.");
    algo_get_tx();
  });

});
