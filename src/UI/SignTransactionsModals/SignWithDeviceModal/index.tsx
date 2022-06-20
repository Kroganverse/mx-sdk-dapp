import React from 'react';
import { Modal } from 'react-bootstrap';
import { useSignTransactionsWithDevice } from 'hooks';
import { SignModalPropsType } from 'types';
import { getGeneratedClasses } from 'UI/utils';
import SignStep from './SignStep';

const SignWithDeviceModal = ({
  handleClose,
  error,
  className = 'device-modal',
  verifyReceiverScam = true,
  title = 'Confirm transaction'
}: SignModalPropsType) => {
  const {
    onSignTransaction,
    onNext,
    onPrev,
    allTransactions,
    waitingForDevice,
    onAbort,
    isLastTransaction,
    currentStep,
    callbackRoute,
    currentTransaction
  } = useSignTransactionsWithDevice({
    onCancel: handleClose,
    verifyReceiverScam
  });
  const classes = getGeneratedClasses(className, true, {
    wrapper: 'modal-container wallet-connect',
    container: 'card container',
    cardBody: 'card-body'
  });
  return (
    <Modal
      show={currentTransaction != null}
      backdrop='static'
      onHide={handleClose}
      className={classes.wrapper}
      animation={false}
      centered
    >
      <div className={classes.container}>
        <div className={classes.cardBody}>
          <SignStep
            {...{
              onSignTransaction,
              onNext,
              onPrev,
              allTransactions,
              waitingForDevice,
              isLastTransaction,
              currentStep,
              callbackRoute,
              currentTransaction,
              handleClose: onAbort,
              className,
              error,
              title
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SignWithDeviceModal;
