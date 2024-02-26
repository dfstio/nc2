# Navigator's Challenge 2

## Ways to implement

### Using recursive proofs

Currently, the number of proofs that can be calculated and merged on high-memory PC is around 150-200, on low-memory PC is less than 50, so processing of the batch of 50-200 messages is not possible on low end hardware assuming that we will need calculate one proof per message and then merge all the calculated proofs.

### Using Actions and Reducer

The actions can be divided into the batches, and the size of the batch will determine the size of the contract. Given that total number of the actions can be greater than the batch size, maxTransactionsWithActions should be set to BATCH_SIZE and skipActionStatePrecondition should be set to true

```typescript
        {
          maxTransactionsWithActions: BATCH_SIZE,
          skipActionStatePrecondition: true,
        }
```

The additional variable isSynced should be introduced to show that all the batches are processed and the final batch's endActionState is equal to the account.actionState.

## The size of the contract depending on batch size

```
Batch Size     Rows number       % of max rows
3              4993               8%
5              6100               9%
50             31007             47%
100            58682             90%
```

## Assumptions

The purpose of this challenge is to demonstrate a principal solution, a full solution with UI is not required, therefore to simplify the code we can use the following assumptions that do not contradict the challenge's text:

- Testing on a local blockchain is enough. This will allow us to omit the parts of the code that
  - fetch accounts from the Mina node
  - handle nonce and transaction fee
  - handle instability of the archive node

## Installation

```
git clone https://github.com/dfstio/nc2
cd nc2
yarn
```

## Test

### Running test

```
yarn test
```

To make testing faster, you can temporarily change BATCH_SIZE from 50 to 5 and compile the contract two times before the testing.

### Test coverage

```
yarn coverage
```

Test coverage is 100 percent. Details are in the jest report in the coverage folder.

```
-------------|---------|----------|---------|---------|-------------------
File         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------|---------|----------|---------|---------|-------------------
All files    |     100 |      100 |     100 |     100 |
 contract.ts |     100 |      100 |     100 |     100 |
-------------|---------|----------|---------|---------|-------------------
```

### Test results

```
nc2 % yarn test
[8:18:30 PM] methods analyzed: 3.127s
[8:18:30 PM] method's total size for a contract with batch size 50 is 31007 rows (47% of max 65536 rows)
[8:18:30 PM] add rows: 2960
[8:18:30 PM] reduce rows: 28047
[8:18:30 PM] Compiling contract...
[8:18:35 PM] MessageMaster compiled: 5.388s
[8:18:35 PM] RSS memory should compile the SmartContract: 1072 MB
[8:18:35 PM] Generated 200 messages, 111 messages are invalid
[8:18:35 PM] RSS memory deployed the contract: 1075 MB
[8:18:47 PM] RSS memory Setting base for RSS memory: 1358 MB
[8:19:59 PM] RSS memory Message 20/200 sent: 1591 MB, changed by 233 MB
[8:23:12 PM] RSS memory Message 60/200 sent: 2078 MB, changed by 720 MB
[8:25:02 PM] RSS memory Message 80/200 sent: 2316 MB, changed by 958 MB
[8:25:54 PM] RSS memory Message 90/200 sent: 2555 MB, changed by 1197 MB
[8:28:17 PM] RSS memory Message 120/200 sent: 2898 MB, changed by 1540 MB
[8:29:13 PM] RSS memory Message 130/200 sent: 3016 MB, changed by 1658 MB
[8:30:52 PM] RSS memory Message 150/200 sent: 3233 MB, changed by 1875 MB
[8:34:40 PM] RSS memory Message 200/200 sent: 3841 MB, changed by 2483 MB
[8:34:51 PM] sent messages: 16:16.066 (m:ss.mmm)
[8:34:51 PM] RSS memory sent the messages: 3902 MB, changed by 2544 MB
[8:34:51 PM] Number of actions: 89
[8:34:51 PM] Reducing 50 of 89 actions
[8:35:08 PM] RSS memory updated the state: 4761 MB, changed by 3403 MB
[8:35:08 PM] reduced: 16.959s
[8:35:08 PM] Reducing 39 of 39 actions
[8:35:24 PM] RSS memory updated the state: 4854 MB, changed by 3496 MB
[8:35:24 PM] reduced: 15.520s
 PASS  tests/contract.test.ts
  Challenge 2
    ✓ should compile contract (8525 ms)
    ✓ should generate messages and check validity of the messages (1 ms)
    ✓ should deploy the contract (197 ms)
    ✓ should send the messages and check that invalid messages are dropped (976057 ms)
    ✓ should check the actions (14 ms)
    ✓ should update the state (32497 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1018.244 s
Ran all test suites.

```

## References

### Actions and Reducer

- Documentation

https://docs.minaprotocol.com/zkapps/o1js/actions-and-reducer

- Examples

https://github.com/o1-labs/o1js/tree/main/src/examples/zkapps/reducer

- Discussion

https://discord.com/channels/484437221055922177/1200733563297988638

- Issues

https://github.com/o1-labs/o1js/issues/1426

https://github.com/o1-labs/o1js/issues/1427
