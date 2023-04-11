import { Transaction } from '@multiversx/sdk-core/out';
import {
  SendTransactionReturnType,
  SendTransactionsPropsType,
  SimpleTransactionType
} from 'types';
import { getWindowLocation } from 'utils/window/getWindowLocation';
import { signTransactions } from './signTransactions';
import { transformAndSignTransactions } from './transformAndSignTransactions';

export async function sendTransactions({
  transactions,
  transactionsDisplayInfo,
  redirectAfterSign = true,
  callbackRoute = getWindowLocation().pathname,
  sendSeparated = false,
  signWithoutSending,
  completedTransactionsDelay,
  sessionInformation,
  skipGuardian,
  minGasLimit
}: SendTransactionsPropsType): Promise<SendTransactionReturnType> {
  try {
    const transactionsPayload = Array.isArray(transactions)
      ? transactions
      : [transactions];

    const areComplexTransactions = transactionsPayload.every(
      (tx) => Object.getPrototypeOf(tx).toPlainObject != null
    );
    let txToSign = transactionsPayload;
    if (!areComplexTransactions) {
      txToSign = await transformAndSignTransactions({
        transactions: transactionsPayload as SimpleTransactionType[],
        minGasLimit
      });
    }

    return signTransactions({
      transactions: txToSign as Transaction[],
      minGasLimit,
      callbackRoute,
      transactionsDisplayInfo,
      customTransactionInformation: {
        redirectAfterSign,
        completedTransactionsDelay,
        sessionInformation,
        skipGuardian,
        signWithoutSending,
        sendSeparated
      }
    });
  } catch (err) {
    console.error('error signing transaction', err as any);
    return { error: err as any, sessionId: null };
  }
}
