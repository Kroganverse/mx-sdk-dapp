import {
  updateSignedTransactions,
  updateSignedTransactionStatus
} from 'reduxStore/slices';
import { store } from 'reduxStore/store';
import { ResultLogType, SmartContractResult } from 'types';
import {
  TransactionBatchStatusesEnum,
  TransactionServerStatusesEnum
} from 'types/enums.types';
import { decodeBase64 } from 'utils';

export function manageFailedTransactions({
  logs,
  results,
  hash,
  sessionId
}: {
  logs: ResultLogType;
  results: SmartContractResult[];
  hash: string;
  sessionId: string;
}) {
  const resultWithError = results?.find(
    (scResult) => scResult?.returnMessage !== ''
  );

  const logWithError = logs.events?.find(
    (event) => event.identifier == 'signalError'
  );

  // console.log(`[manageFailedTransactions] ${logWithError}`);

  const getLogError = () => {
    if (!logWithError || logWithError.topics.length < 2) return undefined;
    return decodeBase64(logWithError.topics[1]);
  };

  store.dispatch(
    updateSignedTransactionStatus({
      transactionHash: hash,
      sessionId,
      status: TransactionServerStatusesEnum.fail,
      errorMessage: resultWithError?.returnMessage ?? getLogError()
    })
  );
  store.dispatch(
    updateSignedTransactions({
      sessionId,
      status: TransactionBatchStatusesEnum.fail,
      errorMessage: resultWithError?.returnMessage ?? getLogError()
    })
  );
}
