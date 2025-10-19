import React, { useState } from 'react';

const SavedPlansModal = ({
  isOpen,
  onClose,
  plans,
  onOpenPlan,
  onArchivePlan,
  onDeletePlan,
  onDuplicatePlan,
  activePlanId
}) => {
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlans = plans.filter(plan => {
    const matchesArchiveState = showArchived === plan.isArchived;
    const matchesSearch = !searchQuery || 
      plan.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArchiveState && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Saved Plans</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1 rounded ${!showArchived ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1 rounded ${showArchived ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
              >
                Archived
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Plans Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map(plan => (
              <div 
                key={plan.id} 
                className={`border rounded-lg p-4 ${
                  plan.id === activePlanId ? 'border-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{plan.name || 'Untitled Plan'}</h3>
                  {plan.id === activePlanId && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <div>Created: {new Date(plan.createdAt).toLocaleDateString()}</div>
                  <div>Modified: {new Date(plan.updatedAt).toLocaleDateString()}</div>
                  <div>Exercises: {plan.exercises?.length || 0}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenPlan(plan.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => onDuplicatePlan(plan.id)}
                    className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      const action = plan.isArchived ? 'unarchive' : 'archive';
                      if (window.confirm(`Are you sure you want to ${action} this plan?`)) {
                        onArchivePlan(plan.id);
                      }
                    }}
                    className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {plan.isArchived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Permanently delete this plan?')) {
                        onDeletePlan(plan.id);
                      }
                    }}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedPlansModal;
