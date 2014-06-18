/*
 * Copyright (c) 2013 Digital Bazaar, Inc. All rights reserved.
 */
var payswarm = {
  money: require('./money')
};
var Money = payswarm.money.Money;

(function() {

var workerData = {
  accounts: {},
  external: {},
  stats: {
    active: {
      contracts: {count: 0, amount: new Money(0)},
      deposits: {count: 0, amount: new Money(0)},
      transfers: {count: 0, amount: new Money(0)},
      withdrawals: {count: 0, amount: new Money(0)}
    },
    settled: {
      contracts: {count: 0, amount: new Money(0)},
      deposits: {count: 0, amount: new Money(0)},
      transfers: {count: 0, amount: new Money(0)},
      withdrawals: {count: 0, amount: new Money(0)}
    },
    voided: {
      contracts: {count: 0, amount: new Money(0)},
      deposits: {count: 0, amount: new Money(0)},
      transfers: {count: 0, amount: new Money(0)},
      withdrawals: {count: 0, amount: new Money(0)}
    }
  }
};

function send(msg, data) {
  process.send({type: msg, data: data || null});
}

function log(level, message, meta) {
  send('log', {
    level: level,
    message: message,
    meta: JSON.stringify(meta)
  });
}

process.on('message', function(msg) {
  if(msg.type === 'txn') {
    reduce(msg.data.txn, msg.data.info);
    send('idle');
  } else if(msg.type === 'end') {
    send('reduce', JSON.stringify(workerData));
  }
});

// reduce transaction
function reduce(t, info) {
  // helper function for common logging and stats
  function _process(status) {
    var s = workerData.stats[status][info.stats];
    s.count += 1;
    s.amount = s.amount.add(t.amount);
  }
  if(!t.settled && !t.voided) {
    // active
    _process('active');
  } else if(t.voided) {
    // voided
    _process('voided');
  } else if(info.type === 'contract' || info.type === 'transfer') {
    // settled contract or transfer
    _process('settled');
    t.transfer.forEach(function(xfer) {
      if(!(xfer.source in workerData.accounts)) {
        workerData.accounts[xfer.source] = {
          balance: new Money(0)
        };
      }
      if(!(xfer.destination in workerData.accounts)) {
        workerData.accounts[xfer.destination] = {
          balance: new Money(0)
        };
      }

      // reverse the xfer
      var src = workerData.accounts[xfer.source];
      src.balance = src.balance.add(xfer.amount);
      var dest = workerData.accounts[xfer.destination];
      dest.balance = dest.balance.subtract(xfer.amount);
    });
  } else if(info.type === 'deposit') {
    // settled deposit
    _process('settled');
    t.transfer.forEach(function(xfer) {
      if(!(xfer.destination in workerData.accounts)) {
        workerData.accounts[xfer.destination] = {
          balance: new Money(0)
        };
      }

      // reverse the xfer
      var dest = workerData.accounts[xfer.destination];
      dest.balance = dest.balance.subtract(xfer.amount);

      // track external xfer
      // this is always an external id for a deposit
      var src = workerData.external[xfer.source];
      // if not found, create it
      if(!src) {
        log('verbose', 'found external deposit source', {id: xfer.source});
        workerData.external[xfer.source] = src = {
          balance: new Money(0)
        };
      }
      src.balance = src.balance.add(xfer.amount);
    });
  } else if(info.type === 'withdrawal') {
    // settled withdrawal
    _process('settled');
    t.transfer.forEach(function(xfer) {
      if(!(xfer.source in workerData.accounts)) {
        workerData.accounts[xfer.source] = {
          balance: new Money(0)
        };
      }

      // reverse the xfer
      var src = workerData.accounts[xfer.source];
      src.balance = src.balance.add(xfer.amount);

      // track external xfer
      // if not a known account, then assume external
      // this can be to an external id or internal account for fees
      // FIXME: check for local authority baseUri prefix?
      var dest = workerData.accounts[xfer.destination];
      if(!dest) {
        // id is external
        dest = workerData.external[xfer.destination];
        // if not found, create it
        if(!dest) {
          log('verbose', 'found external withdrawal destination',
            {id: xfer.destination});
          workerData.external[xfer.destination] = dest = {
            balance: new Money(0)
          };
        }
      }
      dest.balance = dest.balance.subtract(xfer.amount);
    });
  }
} // end reduce transaction

// worker now idle (ready for work)
send('idle');

})();
