# Store Csocsó game results on Algorand Testnet

Store Csocsó game results on Algorand Testnet, using packed libraries for algosdk, jquery and perawalletconnect.

The `perawalletconnect.min.js` library has been made by packing the `@perawallet/connect 1.3.4` Node.js module
by webpack, see https://github.com/A-Maugli/pera-conect-vanillajs-demo-webpack

## SRI (sub resource integrity)

SRI is computed for the packed library. In index.html, the library is refereced specifying this SRI, 
to make it resilient against changes:
```
  <script src="./jslib/perawalletconnect.min.js"
    integrity="sha384-1/BfpY6oNlkbLhIQ2HqXVz2NzZb2zw5D6iDz6Qkdi1E6dCxZyJm1+NN9SMLamlXm"
    crossorigin="anonymous"></script>
```

Simple javascript files like `csocso.js` can also use SRI. To make SRI work, csocso.js had to be saved 
with CRLF terminator, as the browser converts LF to CRLF before computing the SRI checksum. 
```
  <script src="./csocso.js"
    integrity="sha384-wXxHFUa3fMJmbH41xry3h3s7BWS9VkUWHE4j6ZoFpLPRYMGIB6v/oSaCFJajqfzm"
    crossorigin="anonymous"></script>
```

See https://github.com/kubernetes/website/issues/25414,
"Failed to find a valid digest in the 'integrity' attribute for resource js/jquery-3.3.1.min.js with computed SHA-256 integrity"

See also

https://blog.bitsrc.io/the-importance-of-integrity-checks-in-javascript-c6fde630e7
  
https://betterprogramming.pub/protect-your-static-files-with-sub-resource-integrity-sri-in-node-js-35a7e69abebb

## Generating SRI manually
```
cat ./src/jslib/perawalletconnect.min.js | openssl dgst -sha384 -binary | openssl base64 -A
cat ./src/csocso.js | openssl dgst -sha384 -binary | openssl base64 -A
```

## Running the web app
To run the web app, the ./src should be copied to a web server.

To test it in Node.js, start it with a web server:
```
npm -i -g serve
serve ./src
```
and in the browser url paste 
```
localhost:3000
```
Then press `Read game results` or `Save game result`.
To save game results, the transaction should be signed by 'JW6L2Z...FNKILM', using a Pera Wallet.
