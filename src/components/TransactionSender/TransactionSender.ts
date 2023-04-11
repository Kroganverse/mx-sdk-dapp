import { useEffect, useRef } from 'react';
import { Transaction } from '@multiversx/sdk-core/out';
import { Signature } from '@multiversx/sdk-core/out/signature';
import {
  sendSignedTransactions as defaultSendSignedTxs,
  SendSignedTransactionsReturnType
} from 'apiCalls/transactions';
import { newTransaction } from 'models/newTransaction';
import { useDispatch, useSelector } from 'reduxStore/DappProviderContext';
import {
  accountSelector,
  pendingSignedTransactionsSelector,
  signedTransactionsSelector
} from 'reduxStore/selectors';
import {
  clearAllTransactionsToSign,
  setTxSubmittedModal,
  updateSignedTransactions
} from 'reduxStore/slices';
import {
  TransactionBatchStatusesEnum,
  TransactionServerStatusesEnum
} from 'types/enums.types';
import { SignedTransactionsBodyType } from 'types/transactions.types';
import { setNonce } from 'utils/account/setNonce';
import { safeRedirect } from 'utils/redirect';
import { removeTransactionParamsFromUrl } from 'utils/transactions/removeTransactionParamsFromUrl';

export interface TransactionSenderType {
  sendSignedTransactionsAsync?: (
    signedTransactions: Transaction[]
  ) => Promise<SendSignedTransactionsReturnType>;
}

/**
 * Function used to redirect after sending because of Safari cancelling async requests on page change
 */
const optionalRedirect = (sessionInformation: SignedTransactionsBodyType) => {
  const redirectRoute = sessionInformation.redirectRoute;
  if (redirectRoute) {
    safeRedirect(redirectRoute);
  }
};

export const TransactionSender = ({
  sendSignedTransactionsAsync = defaultSendSignedTxs
}: TransactionSenderType) => {
  const account = useSelector(accountSelector);
  const signedTransactions = useSelector(signedTransactionsSelector);
  const pendingTransactions = useSelector(pendingSignedTransactionsSelector);

  const sendingRef = useRef(false);

  const dispatch = useDispatch();

  const clearSignInfo = () => {
    dispatch(clearAllTransactionsToSign());
    sendingRef.current = false;
  };

  async function handleSendWaitingTransactions() {
    const sessionIds = Object.keys(pendingTransactions);
    for (const sessionId of sessionIds) {
      const sessionInformation = signedTransactions?.[sessionId];
      const separateSending =
        sessionInformation?.customTransactionInformation?.sendSeparated;

      if (!separateSending) continue;

      try {
        const { transactions } = signedTransactions[sessionId];
        if (!transactions) {
          continue;
        }

        let transactionsToSend: Transaction | undefined = undefined;
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i];
          if (
            tx.status == TransactionServerStatusesEnum.success &&
            i + 1 < transactions.length
          ) {
            const nextTx = transactions[i + 1];
            if (nextTx.status == TransactionServerStatusesEnum.sent) continue;

            transactionsToSend = newTransaction(nextTx);
            const signature = new Signature(nextTx.signature);

            transactionsToSend.applySignature(signature);
          }
        }

        if (!transactionsToSend) continue;

        const responseHashes = await sendSignedTransactionsAsync([
          transactionsToSend
        ]);

        const newStatus = TransactionServerStatusesEnum.sent;
        const newTransactions = transactions.map((transaction) => {
          if (responseHashes.includes(transaction.hash)) {
            return { ...transaction, status: newStatus };
          }

          return transaction;
        });

        dispatch(
          updateSignedTransactions({
            sessionId,
            status: TransactionBatchStatusesEnum.sent,
            transactions: newTransactions
          })
        );
      } catch (error) {
        console.error('Unable to send transactions', error);
        dispatch(
          updateSignedTransactions({
            sessionId,
            status: TransactionBatchStatusesEnum.fail,
            errorMessage: (error as any).message
          })
        );
        clearSignInfo();
      }
    }
  }

  async function handleSendTransactions() {
    const sessionIds = Object.keys(signedTransactions);
    for (const sessionId of sessionIds) {
      const sessionInformation = signedTransactions?.[sessionId];
      const skipSending =
        sessionInformation?.customTransactionInformation?.signWithoutSending;
      const separateSending =
        sessionInformation?.customTransactionInformation?.sendSeparated;

      if (!sessionId || skipSending) {
        optionalRedirect(sessionInformation);
        continue;
      }

      try {
        const isSessionIdSigned =
          signedTransactions[sessionId].status ===
          TransactionBatchStatusesEnum.signed;
        const shouldSendCurrentSession =
          isSessionIdSigned && !sendingRef.current;
        if (!shouldSendCurrentSession) {
          continue;
        }
        const { transactions } = signedTransactions[sessionId];

        if (!transactions) {
          continue;
        }
        sendingRef.current = true;

        const transactionsToSend = transactions.map((tx) => newTransaction(tx));
        let responseHashes: SendSignedTransactionsReturnType;
        if (separateSending && transactionsToSend.length > 1) {
          responseHashes = await sendSignedTransactionsAsync([
            transactionsToSend[0]
          ]);
        } else {
          responseHashes = await sendSignedTransactionsAsync(
            transactionsToSend
          );
        }

        const newStatus = TransactionServerStatusesEnum.sent;
        const newTransactions = transactions.map((transaction) => {
          if (responseHashes.includes(transaction.hash)) {
            return { ...transaction, status: newStatus };
          }

          return transaction;
        });

        const submittedModalPayload = {
          sessionId,
          submittedMessage: 'submitted'
        };

        dispatch(setTxSubmittedModal(submittedModalPayload));
        dispatch(
          updateSignedTransactions({
            sessionId,
            status: TransactionBatchStatusesEnum.sent,
            transactions: newTransactions
          })
        );
        clearSignInfo();
        setNonce(account.nonce + transactions.length);

        optionalRedirect(sessionInformation);
        const [transaction] = transactionsToSend;
        removeTransactionParamsFromUrl({
          transaction
        });
      } catch (error) {
        console.error('Unable to send transactions', error);
        dispatch(
          updateSignedTransactions({
            sessionId,
            status: TransactionBatchStatusesEnum.fail,
            errorMessage: (error as any).message
          })
        );
        clearSignInfo();
      } finally {
        sendingRef.current = false;
      }
    }
  }

  useEffect(() => {
    handleSendTransactions();
    handleSendWaitingTransactions();
  }, [signedTransactions, account]);

  return null;
};
