# Navigator's Challenge 2

## Ways to implement

### Using recursive proofs

Currently, the number of proofs that can be calculated and merged before running out of memory on high-memory PC is around 150-200, on low-memory PC is less than 50, so processing of the batch of 50-200 messages is not possible on low memory hardware assuming that we will need calculate one proof per message and then merge all the calculated proofs.

### Using Actions and Reducer

The actions can be divided into the batches, and the size of the batch will determine the size of the contract. Given that total number of the actions can be greater than the batch size, maxTransactionsWithActions should be set to BATCH_SIZE and skipActionStatePrecondition should be set to true:

```typescript
        {
          maxTransactionsWithActions: BATCH_SIZE,
          skipActionStatePrecondition: true,
        }
```

The additional variable isSynced should be introduced to show that all the batches are processed and the final batch's endActionState is equal to the account.actionState.

## The size of the contract depending on batch size

```
BATCH_SIZE     Rows number       % of max rows
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

- Handling duplicate messages.
  According to the challenge, "In case the message number is not greater than the previous one, this means that this is a duplicate message. In this case it still should be processed, but the message details do not need to be checked." The purpose of the contract is to set the state to the maximum valid message number, therefore if at least one message with the same number is valid, we should account for this number when finding the maximum message number. If both messages are invalid, we will drop BOTH messages. In such way, we still guarantee that invalid message cannot be processed by resending it (processing invalid message by resending it clearly was not the intention of the challenge wording)

- Circuit size optimization
  According to the challenge, "This program is needed to run on low spec hardware so you need to find a way to process the batch so that the circuit size remains low." The circuit size can be changed by changing the constant BATCH_SIZE. We assume that having number of rows sightly less than 50% of the maximum size is optimal choice for low spec hardware. For very low spec hardware, the BATCH_SIZE can be set even lower in accordance with the table above.

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
[8:54:18 PM] methods analyzed: 3.061s
[8:54:18 PM] method's total size for a contract with batch size 50 is 31007 rows (47% of max 65536 rows)
[8:54:18 PM] add rows: 2960
[8:54:18 PM] reduce rows: 28047
[8:54:18 PM] Compiling contract...
[8:54:23 PM] MessageMaster compiled: 5.119s
[8:54:23 PM] RSS memory should compile the SmartContract: 1066 MB
[8:54:23 PM] Generated 200 messages, 107 messages are invalid
[8:54:23 PM] RSS memory deployed the contract: 1068 MB
[8:57:48 PM] RSS memory Message 60/200 sent: 1960 MB
[8:58:28 PM] RSS memory Message 70/200 sent: 2113 MB
[8:59:19 PM] RSS memory Message 80/200 sent: 2275 MB
[9:00:12 PM] RSS memory Message 90/200 sent: 2405 MB
[9:02:18 PM] RSS memory Message 110/200 sent: 2783 MB
[9:05:08 PM] RSS memory Message 140/200 sent: 3215 MB
[9:05:46 PM] RSS memory Message 150/200 sent: 3196 MB
[9:08:11 PM] RSS memory Message 170/200 sent: 3599 MB
[9:09:56 PM] RSS memory Message 190/200 sent: 3902 MB
[9:10:48 PM] sent messages: 16:25.326 (m:ss.mmm)
[9:10:48 PM] RSS memory sent the messages: 4029 MB
[9:10:48 PM] Number of actions: 93
[9:10:48 PM] Reducing 50 of 93 actions
[9:11:04 PM] RSS memory updated the state: 4947 MB
[9:11:04 PM] reduced: 15.648s
[9:11:04 PM] Reducing 43 of 43 actions
[9:11:18 PM] RSS memory updated the state: 5083 MB
[9:11:18 PM] reduced: 14.400s
 PASS  tests/contract.test.ts
  Challenge 2
    ✓ should compile contract (8190 ms)
    ✓ should generate messages and check validity of the messages (1 ms)
    ✓ should deploy the contract (196 ms)
    ✓ should send the messages and check that invalid messages are dropped (985326 ms)
    ✓ should check the actions (15 ms)
    ✓ should update the state (30064 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1024.779 s
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
