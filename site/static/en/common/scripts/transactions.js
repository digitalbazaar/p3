/*!
 * Transaction Activity Support
 *
 * @requires jQuery v1.7+ (http://jquery.com/)
 *
 * @author Dave Longley
 */
// FIXME: use RequireJS AMD format
(function($) {

var module = angular.module('activity', ['ui']).
run(function() {
  // FIXME: run init code here
});

module.value('ui.config', {
  date: {
    autoSize: true
  }
});

module.controller('ActivityCtrl', function($scope) {
  // initialize model
  $scope.session = window.data.session;
  $scope.account = {
    label: 'FIXME'
  };
  $scope.txns = [];
  $scope.first = 1;
  $scope.last = 0;
  $scope.total = 0;
  $scope.table = [];
  $scope.loading = false;

  // set start date to last ms of today
  var now = new Date();
  $scope.startDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  $scope.textDate = $scope.startDate.toString();

  // convert the text date into the last millisecond of the day, also
  // separate model vars are used to avoid modifying the text while
  // typing and to ensure the input blurs when using the calendar selector
  $scope.dateChanged = function() {
    var d = new Date($scope.textDate);
    if(!isNaN(+d)) {
      $scope.startDate = new Date(
        d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }
  };

  // lose focus and hide datepicker
  $scope.dateQuitKeyPressed = function($event) {
    $($event.target).datepicker('hide');
    $event.target.blur();
  };

  $scope.getRowType = function(row) {
    if(row.type.indexOf('com:Deposit') !== -1) {
      return 'deposit';
    }
    else if(row.type.indexOf('ps:Contract') !== -1) {
      return 'contract';
    }
    else if(row.type.indexOf('com:Transfer') !== -1) {
      return 'transfer';
    }
    else {
      return 'error';
    }
  };

  // create loading activity spinner
  var spinner = new Spinner({
    lines: 11, // The number of lines to draw
    length: 3, // The length of each line
    width: 3, // The line thickness
    radius: 5, // The radius of the inner circle
    rotate: 0, // The rotation offset
    color: '#000', // #rgb or #rrggbb
    speed: 1.0, // Rounds per second
    trail: 100, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'table-spinner inline-block', // CSS class for spinner
    top: 'auto', // Top position relative to parent in px
    left: 'auto' // Left position relative to parent in px
  });

  $scope.getMore = function() {
    $scope.loading = true;
    spinner.spin();
    $('#spinner').append(spinner.el);

    // FIXME: simulate fetching from server
    setTimeout(function() {

    // FIXME: tmp testing data, get next set of txns from backend
    var txn = {
      "@context" : "http://purl.org/payswarm/v1",
      "amount" : "10.42",
      "created" : "2012-08-06T17:11:41Z",
      "id" : "https://payswarm.dev:19443/transactions/1.1.e7.4",
      "payee" : [
              {
                      "type" : "com:Payee",
                      "payeeRate" : "10.0000000",
                      "payeeRateType" : "com:FlatAmount",
                      "destination" : "https://payswarm.dev:19443/i/dev/accounts/primary",
                      "comment" : "Default demo deposit.",
                      "payeePosition" : 0
              },
              {
                      "type" : "com:Payee",
                      "destination" : "https://payswarm.dev:19443/i/authority/accounts/fees",
                      "payeeRateType" : "com:Percentage",
                      "payeeRate" : "4.1666667",
                      "payeeRateContext" : "com:Exclusive",
                      "comment" : "Deposit Processing Service",
                      "payeePosition" : 1
              }
      ],
      "psaSettleAfter" : 1344273101424,
      "referenceId" : "payswarm.https://payswarm.dev:19443/transactions/1.1.e7.4",
      "settled" : "2012-08-06T17:11:41Z",
      "source" : {
              "id" : "urn:dev-authority-bank-account",
              "type" : "com:PaymentToken",
              "label" : "Free Test Money Token",
              "owner" : "https://payswarm.dev:19443/i/authority",
              "paymentToken" : "e5e9cbd389661d6022d87be5d679f0cc2e2e1063",
              "paymentGateway" : "Test",
              "paymentMethod" : "bank:BankAccount",
              "bankAccount" : "*******890"
      },
      "transfer" : [
              {
                      "type" : "com:Transfer",
                      "forTransaction" : "https://payswarm.dev:19443/transactions/1.1.e7.4",
                      "source" : "urn:payswarm-external-account",
                      "destination" : "https://payswarm.dev:19443/i/dev/accounts/primary",
                      "amount" : "10.00",
                      "comment" : "Default demo deposit."
              },
              {
                      "type" : "com:Transfer",
                      "forTransaction" : "https://payswarm.dev:19443/transactions/1.1.e7.4",
                      "source" : "urn:payswarm-external-account",
                      "destination" : "https://payswarm.dev:19443/i/authority/accounts/fees",
                      "amount" : "0.42",
                      "comment" : "Deposit Processing Service"
              }
      ],
      "type" : [
              "com:Transaction",
              "com:Deposit"
      ]
    };
    _addTxn($scope, txn);

    txn = {
      "@context" : "http://purl.org/payswarm/v1",
      "type": [
        "com:Transaction",
        "ps:Contract"
      ],
      "created": "2012-08-08T20:56:11Z",
      "listing": {
        "id": "http://recipes.payswarm.com/?p=10651#listing",
        "type": [
          "ps:Listing",
          "gr:Offering"
        ],
        "payee": [
          {
            "id": "http://recipes.payswarm.com/?p=10651#listing-payee",
            "type": "com:Payee",
            "destination": "https://dev.payswarm.com/i/vendor/accounts/primary",
            "payeePosition": "0",
            "payeeRate": "0.0500000",
            "payeeRateType": "com:FlatAmount",
            "comment": "Payment for Cheese Potato Soup by chef."
          },
          {
            "type": "com:Payee",
            "payeeRate": "2.00",
            "payeeRateType": "com:Percentage",
            "destination": "https://dev.payswarm.com/i/authority/accounts/main",
            "comment": "PaySwarm Sandbox Authority Processing",
            "payeeRateContext": [
              "com:Inclusive",
              "com:TaxExempt"
            ],
            "payeePosition": "01"
          }
        ],
        "payeeRule": [
          {
            "id": "_:t2",
            "type": "com:PayeeRule",
            "accountOwnerType": "ps:Authority",
            "maximumPayeeRate": "10.0000000",
            "payeeRateContext": [
              "com:Inclusive",
              "com:Tax",
              "com:TaxExempt"
            ],
            "payeeRateType": "com:Percentage"
          }
        ],
        "asset": "http://recipes.payswarm.com/?p=10651#asset",
        "assetHash": "1a10bb25e18d0a8f566ead3711c197b8c209d090",
        "license": "http://purl.org/payswarm/licenses/blogging",
        "licenseHash": "ad8f72fcb47e867231d957c0bffb4c02d275926a",
        "validFrom": "2012-08-08T00:58:22+00:00",
        "validUntil": "2012-08-09T00:58:22+00:00",
        "signature": {
          "id": "_:t3",
          "type": "sec:GraphSignature2012",
          "created": "2012-08-08T00:58:22+00:00",
          "creator": "https://dev.payswarm.com/i/vendor/keys/1",
          "signatureValue": "aWkAeWJPEiD+x0HuIr111z1NEPIG9cwKGobrf1XPBmKAmJzgHkWJ2rRfdOLEQQ43Pp9++UlMNeI+14LP6x69tGIhr6DRJKtB7hmEQ2esJeeN/ifVNBE1dGFLXFNXh3dIKMUQCLmbHjpkvTjZoRCz9w+LJWLxBhL2vwCHwKQU3fq9VwI88EfYkEEnk1wHuvRLH1ccHH3gG9e18DFZzsg70Z6MUdOJCmC3JACAEULpryEctHuoQekaL005b1dQhpCNE8nrTFT6ybXM8K+ylDI4shZG03D82LQon5ribdKph4mPbqGjiDXqPYpfn5p0vK06xXp1TMyQOjAETrtJTVWmwQ=="
        }
      },
      "listingHash": "17f61b9a7df203e1027fa61362e2d999af25883e",
      "asset": {
        "id": "http://recipes.payswarm.com/?p=10651#asset",
        "type": [
          "ps:Asset",
          "ps:WebPage"
        ],
        "creator": {
          "id": "_:t0",
          "fullName": "chef"
        },
        "title": "Cheese Potato Soup",
        "assetContent": "http://recipes.payswarm.com/?p=10651",
        "assetProvider": "https://dev.payswarm.com/i/vendor",
        "signature": {
          "id": "_:t1",
          "type": "sec:GraphSignature2012",
          "created": "2012-08-08T00:58:22+00:00",
          "creator": "https://dev.payswarm.com/i/vendor/keys/1",
          "signatureValue": "H0ariV8Yvo+PUNdTH0TVwREVimi16lTWIv6Hs2jgl38Op2bNByciOgXCdQFB2uIR8Z5PnsntAtilYVc9E0wx5oXeLqzPEq2JockmyCHT9etyZplsmjZhjNFhpQdSzHU6Llmhw/tGICQVKcPOApXAk/q79jvbs2fLpCZPW8zz6hYcqVzTvAD6n5+tndHi7SFkn9yhGu1+VwW1wOf1n5VzNZPwW9bnEfSj8RrmZvKsmemsOmuARpDQZniNG0ZM32brRnAJzVmeB+7l5FnWHdOh53YsJoBwzpVVl30rGDd5L8IQWk45krlh5kX2N4LSQdZ/fTZrXUMU6bZhIu0T3ixSHA=="
        }
      },
      "license": {
        "id": "http://purl.org/payswarm/licenses/blogging",
        "type": "ps:License",
        "licenseTemplate": "Personal Use License for Articles\n\nThe article content owner grants the buyer a non-exclusive perpetual \npersonal-use license to view, download and copy the article, subject to the \nfollowing restrictions:\n\nThis license is for personal use only. Personal use means non-commercial \nuse of the article(s) for display on personal websites and computers, or \nmaking prints for personal use. The articles(s) may not be used in any way \nwhatsoever in which you charge money, collect fees, or receive any form of \nremuneration. The article(s) may not be used in advertising. The articles(s) \nmay not be resold, relicensed, or sub-licensed.\n\nTitle and ownership, and all rights now and in the future, of and for the \narticle(s) remain exclusively with the content owner.\n\nThere are no warranties, express or implied. The articles(s) are provided \n'as is.'\n\nNeither the writer, payment processing service, nor hosting service will \nbe liable for any third party claims or incidental, consequential or other \ndamages arising out of this license or buyer's use of the article(s).\n"
      },
      "assetProvider": {
        "id": "https://dev.payswarm.com/i/vendor",
        "label": "Vendor",
        "homepage": "http://example.com/vendor",
        "description": "The default PaySwarm Vendor"
      },
      "payee": [
        {
          "type": "com:Payee",
          "payeeRate": "2.00",
          "payeeRateType": "com:Percentage",
          "destination": "https://dev.payswarm.com/i/authority/accounts/main",
          "comment": "PaySwarm Sandbox Authority Processing",
          "payeeRateContext": [
            "com:Inclusive",
            "com:TaxExempt"
          ],
          "payeePosition": "01"
        }
      ],
      "id": "https://dev.payswarm.com/transactions/1.3.30.1",
      "assetAcquirer": {
        "id": "https://dev.payswarm.com/i/dev",
        "address": [
          {
            "psaValidated": false,
            "label": "Default",
            "countryName": "US",
            "fullName": "Dev User",
            "locality": "City",
            "postalCode": "10000",
            "region": "State",
            "streetAddress": "100 Street Apt 1"
          }
        ]
      },
      "amount": "0.0500000",
      "transfer": [
        {
          "type": "com:Transfer",
          "forTransaction": "https://dev.payswarm.com/transactions/1.3.30.1",
          "source": "https://dev.payswarm.com/i/dev/accounts/primary",
          "destination": "https://dev.payswarm.com/i/vendor/accounts/primary",
          "amount": "0.0490000",
          "comment": "Payment for Cheese Potato Soup by chef."
        },
        {
          "type": "com:Transfer",
          "forTransaction": "https://dev.payswarm.com/transactions/1.3.30.1",
          "source": "https://dev.payswarm.com/i/dev/accounts/primary",
          "destination": "https://dev.payswarm.com/i/authority/accounts/main",
          "amount": "0.0010000",
          "comment": "PaySwarm Sandbox Authority Processing"
        }
      ],
      "referenceId": "payswarm.https://dev.payswarm.com/transactions/1.3.30.1",
      "psaSettleAfter": 1344459377221
    };
    _addTxn($scope, txn);

    $scope.loading = false;
    spinner.stop();
    $scope.$apply();
    }, 2000);
  };

  // show/hide transaction details
  $scope.toggleDetails = function(txn) {
    txn.transfer.forEach(function(transfer) {
      transfer.hidden = !transfer.hidden;
    });
  };

  // populate table with first set of txns
  $scope.getMore();
});

// adds a txn to the model
function _addTxn($scope, txn) {
  $scope.txns.push(txn);
  $scope.last += 1;
  $scope.table.push(txn);
  txn.transfer.forEach(function(transfer) {
    transfer.hidden = true;
    $scope.table.push(transfer);
  });
}

})(jQuery);
