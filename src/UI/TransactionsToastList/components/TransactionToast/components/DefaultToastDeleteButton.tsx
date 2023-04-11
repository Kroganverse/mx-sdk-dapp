import React from 'react';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { DataTestIdsEnum } from 'constants/index';

export interface DefaultToastDeleteButtonPropsType {
  onClick?: () => void;
  className?: string;
}

export const DefaultToastDeleteButton = ({
  className = 'dapp-default-toast-delete-button',
  onClick
}: DefaultToastDeleteButtonPropsType) => {
  return (
    <button
      type='button'
      className={className}
      onClick={onClick}
      data-testid={DataTestIdsEnum.deleteToastButton}
    >
      <FontAwesomeIcon icon={faTimes} size='xs' />
    </button>
  );
};
