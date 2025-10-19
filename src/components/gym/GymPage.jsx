import React from 'react';
import PropTypes from 'prop-types';

const SavedPlansModal = ({
  isOpen,
  onClose,
  plans,
  onOpenPlan,
  onArchivePlan,
  onDeletePlan,
  onDuplicatePlan,
  activePlanId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="saved-plans-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Saved Plans</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {plans.length === 0 ? (
            <p>No saved plans available.</p>
          ) : (
            <ul className="plans-list">
              {plans.map((plan) => (
                <li key={plan.firebaseId} className="plan-item">
                  <div className="plan-info">
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-date">
                      Created: {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="plan-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => onOpenPlan(plan.firebaseId)}
                      disabled={plan.firebaseId === activePlanId}
                    >
                      Open
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onArchivePlan(plan.firebaseId)}
                    >
                      {plan.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onDuplicatePlan(plan.firebaseId)}
                    >
                      Duplicate
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => onDeletePlan(plan.firebaseId)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

SavedPlansModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      firebaseId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      createdAt: PropTypes.string.isRequired,
      isArchived: PropTypes.bool,
    })
  ).isRequired,
  onOpenPlan: PropTypes.func.isRequired,
  onArchivePlan: PropTypes.func.isRequired,
  onDeletePlan: PropTypes.func.isRequired,
  onDuplicatePlan: PropTypes.func.isRequired,
  activePlanId: PropTypes.string,
};

export default SavedPlansModal;