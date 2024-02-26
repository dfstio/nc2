import { describe, expect, it } from "@jest/globals";
import {
  Field,
  PrivateKey,
  Mina,
  Reducer,
  AccountUpdate,
  Bool,
  Account,
} from "o1js";
import { Message, MessageMaster, BATCH_SIZE } from "../src/contract";

const MESSAGES_COUNT = BATCH_SIZE * 4;

describe("Challenge 2", () => {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const deployer = Local.testAccounts[0].privateKey;
  const sender = deployer.toPublicKey();
  const privateKey = PrivateKey.random();
  const publicKey = privateKey.toPublicKey();
  const zkApp = new MessageMaster(publicKey);
  const messages: Message[] = [];
  const isMessageValid: boolean[] = [];
  let maxNumber: number = 0;
  let invalidMessages = 0;

  it(`should compile contract`, async () => {
    console.time("methods analyzed");
    let methods = MessageMaster.analyzeMethods();
    console.timeEnd("methods analyzed");
    //console.log("methods", methods);
    // calculate the size of the contract - the sum or rows for each method
    let size = Object.values(methods).reduce(
      (acc, method) => acc + method.rows,
      0
    );
    const maxRows = 2 ** 16;
    // calculate percentage rounded to 0 decimal places
    let percentage = Math.round((size / maxRows) * 100);

    console.log(
      `method's total size for a contract with batch size ${BATCH_SIZE} is ${size} rows (${percentage}% of max ${maxRows} rows)`
    );
    console.log("add rows:", methods["add"].rows);
    console.log("reduce rows:", methods["reduce"].rows);

    console.log("Compiling contract...");
    console.time("MessageMaster compiled");
    await MessageMaster.compile();
    console.timeEnd("MessageMaster compiled");
    Memory.info(`should compile the SmartContract`);
  });

  it("should generate messages and check validity of the messages", () => {
    for (let i = 0; i < MESSAGES_COUNT; i++) {
      const num = i < 2 ? 1 : i + 1; // to generate message numbers 1, 1, 3, 4, 5, 6, 7 to test the reducer with duplicate and missing message numbers
      // Generate some invalid values
      const agentID = Math.floor(Math.random() * 4000); // Agent ID (should be between 0 and 3000)
      const agentXLocation = Math.floor(Math.random() * 16000); // Agent XLocation (should be between 0 and 15000)
      const agentYLocation = Math.floor(4000 + Math.random() * 17000); // Agent YLocation (should be between 5000 and 20000)
      const checkSum =
        agentID +
        agentXLocation +
        agentYLocation +
        Math.floor(Math.random() * 1.1); // CheckSum is the sum of Agent ID , Agent XLocation , and Agent YLocation
      const isValid = checkMessage(
        agentID,
        agentXLocation,
        agentYLocation,
        checkSum
      );
      const message = new Message({
        num: Field(num),
        agentID: Field(agentID),
        agentXLocation: Field(agentXLocation),
        agentYLocation: Field(agentYLocation),
        checkSum: Field(checkSum),
      });
      messages.push(message);
      isMessageValid.push(isValid);
      if (!isValid) invalidMessages++;
      if (isValid && num > maxNumber) maxNumber = num;
    }
    console.log(
      `Generated ${MESSAGES_COUNT} messages, ${invalidMessages} messages are invalid`
    );
  });

  it("should deploy the contract", async () => {
    const tx = await Mina.transaction({ sender }, () => {
      AccountUpdate.fundNewAccount(sender);
      zkApp.deploy({});
      zkApp.num.set(Field(0));
      zkApp.actionState.set(Reducer.initialActionState);
      zkApp.isSynced.set(Bool(true));
    });
    await tx.sign([deployer, privateKey]).send();
    Memory.info(`deployed the contract`);
    const account = Account(publicKey);
    const actionState = account.actionState.get();
    const reducerActionsState = Reducer.initialActionState;
    expect(actionState.toJSON()).toEqual(reducerActionsState.toJSON());
  });

  it("should send the messages and check that invalid messages are dropped", async () => {
    console.time("sent messages");
    for (let i = 0; i < MESSAGES_COUNT; i++) {
      let added = true;
      try {
        const tx = await Mina.transaction({ sender }, () => {
          zkApp.add(messages[i]);
        });
        if (i % 10 === 9)
          Memory.info(`Message ${i + 1}/${MESSAGES_COUNT} sent`);
        await tx.prove();
        if (i === 0) Memory.info(`Setting base for RSS memory`, false, true);
        await tx.sign([deployer]).send();
      } catch (e) {
        added = false;
      }
      expect(added).toBe(isMessageValid[i]);
    }
    console.timeEnd("sent messages");
    Memory.info(`sent the messages`);
  });

  it("should check the actions", async () => {
    let actions = zkApp.reducer.getActions({
      fromActionState: zkApp.actionState.get(),
    });
    console.log("Number of actions:", actions.length);
    expect(actions.length).toEqual(MESSAGES_COUNT - invalidMessages);
    const actions2 = await Mina.fetchActions(publicKey);

    const account = Account(publicKey);
    const finalActionState = account.actionState.get();
    let j = 0;
    if (Array.isArray(actions2)) {
      expect(actions.length).toEqual(actions2.length);
      for (let i = 0; i < actions2.length; i++) {
        //console.log("action", i, actions2[i].actions[0]);
        //console.log("hash", actions2[i].hash);

        const num = Field.fromJSON(actions2[i].actions[0][0]);
        while (isMessageValid[j] === false) j++;
        expect(num.toJSON()).toEqual(messages[j].num.toJSON());
        j++;
      }
    }
  });

  it("should update the state", async () => {
    let actions = await Mina.fetchActions(publicKey);
    let length = 0;
    let startActionState: Field = zkApp.actionState.get();
    let firstPass = true;
    if (Array.isArray(actions)) length = Math.min(actions.length, BATCH_SIZE);
    while (length > 0) {
      const isSynced = zkApp.isSynced.get().toBoolean();
      expect(isSynced).toEqual(firstPass);
      firstPass = false;
      console.time("reduced");
      if (Array.isArray(actions)) {
        console.log(`Reducing ${length} of ${actions.length} actions`);
        const endActionState: Field = Field.fromJSON(actions[length - 1].hash);

        const tx = await Mina.transaction({ sender }, () => {
          zkApp.reduce(startActionState, endActionState);
        });
        await tx.prove();
        await tx.sign([deployer]).send();
        Memory.info(`updated the state`);
      }
      startActionState = zkApp.actionState.get();
      const actionStates = { fromActionState: startActionState };
      actions = await Mina.fetchActions(publicKey, actionStates);
      if (Array.isArray(actions)) length = Math.min(actions.length, BATCH_SIZE);
      console.timeEnd("reduced");
    }
    const isSynced = zkApp.isSynced.get().toBoolean();
    expect(isSynced).toEqual(true);
    const num = zkApp.num.get();
    expect(num.toJSON()).toEqual(Field(maxNumber).toJSON());
  });
});

/*
Each message has
Message number
Message details
Agent ID (should be between 0 and 3000)
Agent XLocation (should be between 0 and 15000)
Agent YLocation (should be between 5000 and 20000)
CheckSum

You need to check that
CheckSum is the sum of Agent ID , Agent XLocation , and Agent YLocation
the 4 message details numbers are in the correct range
Agent YLocation should be greater than Agent XLocation
If Agent ID is zero we don't need to check the other values, but this is still a valid message
*/
function checkMessage(
  agentID: number,
  agentXLocation: number,
  agentYLocation: number,
  checkSum: number
): boolean {
  if (agentID === 0) return true;
  if (agentID < 0 || agentID > 3000) return false;
  if (agentXLocation < 0 || agentXLocation > 15000) return false;
  if (agentYLocation < 5000 || agentYLocation > 20000) return false;
  if (agentYLocation <= agentXLocation) return false;
  if (checkSum !== agentID + agentXLocation + agentYLocation) return false;
  return true;
}

class Memory {
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  static rss: number = 0;
  constructor() {
    Memory.rss = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  public static info(
    description: string = ``,
    fullInfo: boolean = false,
    reset: boolean = false
  ) {
    const memoryData = process.memoryUsage();
    const formatMemoryUsage = (data: number) =>
      `${Math.round(data / 1024 / 1024)} MB`;
    const oldRSS = Memory.rss;
    if (reset) Memory.rss = Math.round(memoryData.rss / 1024 / 1024);

    const memoryUsage = fullInfo
      ? {
          step: `${description}:`,
          rssDelta: `${(oldRSS === 0
            ? 0
            : Memory.rss - oldRSS
          ).toString()} MB -> Resident Set Size memory change`,
          rss: `${formatMemoryUsage(
            memoryData.rss
          )} -> Resident Set Size - total memory allocated`,
          heapTotal: `${formatMemoryUsage(
            memoryData.heapTotal
          )} -> total size of the allocated heap`,
          heapUsed: `${formatMemoryUsage(
            memoryData.heapUsed
          )} -> actual memory used during the execution`,
          external: `${formatMemoryUsage(
            memoryData.external
          )} -> V8 external memory`,
        }
      : `RSS memory ${description}: ${formatMemoryUsage(memoryData.rss)}${
          oldRSS === 0
            ? ``
            : `, changed by ` +
              (Math.round(memoryData.rss / 1024 / 1024) - oldRSS).toString() +
              ` MB`
        }`;

    console.log(memoryUsage);
  }
}
