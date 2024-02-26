import {
  Field,
  state,
  State,
  method,
  SmartContract,
  DeployArgs,
  Reducer,
  Permissions,
  Struct,
  Bool,
  Provable,
} from "o1js";

export const BATCH_SIZE = 50;

export class Message extends Struct({
  num: Field, // Message number
  agentID: Field, // should be between 0 and 3000
  agentXLocation: Field, // should be between 0 and 15000
  agentYLocation: Field, // should be between 5000 and 20000
  checkSum: Field, // CheckSum is the sum of Agent ID, Agent XLocation, and Agent YLocation
}) {}

export class MessageMaster extends SmartContract {
  @state(Field) num = State<Field>();
  @state(Field) actionState = State<Field>();
  @state(Bool) isSynced = State<Bool>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.account.permissions.set({
      ...Permissions.default(),
      editState: Permissions.proof(),
    });
  }

  reducer = Reducer({
    actionType: Field,
  });

  events = {
    received: Field,
    processed: Field,
  };

  @method add(message: Message) {
    /*
      if (agentID === 0) return true;
      if (agentID < 0 || agentID > 3000) return false;
      if (agentXLocation < 0 || agentXLocation > 15000) return false;
      if (agentYLocation < 5000 || agentYLocation > 20000) return false;
      if (agentYLocation <= agentXLocation) return false;
      if (checkSum !== agentID + agentXLocation + agentYLocation) return false;
      return true;
    */
    const isZero = message.agentID.equals(0);
    const constrain1 = message.agentID.lessThanOrEqual(3000);
    const constrain2 = message.agentXLocation.lessThanOrEqual(15000);
    const constrain3 = message.agentYLocation.greaterThanOrEqual(5000);
    const constrain4 = message.agentYLocation.lessThanOrEqual(20000);
    const constrain5 = message.agentYLocation.greaterThan(
      message.agentXLocation
    );
    const constrain6 = message.checkSum.equals(
      message.agentID.add(message.agentXLocation).add(message.agentYLocation)
    );
    const isValid = isZero.or(
      constrain1.and(
        constrain2.and(
          constrain3.and(constrain4.and(constrain5.and(constrain6)))
        )
      )
    );
    isValid.assertEquals(Bool(true));
    this.reducer.dispatch(message.num);
    this.emitEvent("received", message.num);
  }

  @method reduce(startActionState: Field, endActionState: Field) {
    const actionState = this.actionState.getAndRequireEquals();
    actionState.assertEquals(startActionState);

    const pendingActions = this.reducer.getActions({
      fromActionState: actionState,
      endActionState,
    });

    const num = this.num.getAndRequireEquals();

    const { state: newMessageNumber, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Field,
        (state: Field, action: Field) => {
          return Provable.if(state.lessThanOrEqual(action), action, state);
        },
        {
          state: num,
          actionState: actionState,
        },
        {
          maxTransactionsWithActions: BATCH_SIZE,
          skipActionStatePrecondition: true,
        }
      );
    newActionState.assertEquals(endActionState);
    const accountActionState = this.account.actionState.getAndRequireEquals();
    const isSynced = newActionState.equals(accountActionState);
    this.isSynced.set(isSynced);
    this.actionState.set(newActionState);
    this.num.set(newMessageNumber);
    this.emitEvent("processed", newMessageNumber);
  }
}
