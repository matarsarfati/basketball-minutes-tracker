import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadPlansFromFirestore, archivePlan, deletePlanFromFirestore } from '../services/planService';

export default function SavedPlansPage() {
  const [plans, setPlans] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadPlans = async () => {
      const plans = await loadPlansFromFirestore();
      setPlans(plans);
    };
    loadPlans();
  }, []);

  const filteredPlans = plans.filter(plan => {
    const matchesArchiveState = showArchived === plan.isArchived;
    const matchesSearch = !searchQuery || 
      plan.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArchiveState && matchesSearch;
  });

  const handleOpenPlan = (planId) => {
    navigate(`/gym?plan=${planId}`);
  };

  const handleArchivePlan = async (planId) => {
    try {
      await archivePlan(planId);
      setPlans(plans.map(p => 
        p.firebaseId === planId 
          ? { ...p, isArchived: !p.isArchived }
          : p
      ));
    } catch (error) {
      console.error('Failed to archive plan:', error);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      await deletePlanFromFirestore(planId);
      setPlans(plans.filter(p => p.firebaseId !== planId));
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Saved Workout Plans</h1>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1 rounded ${!showArchived ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
            >
              Active Plans
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1 rounded ${showArchived ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
            >
              Archived Plans
            </button>
          </div>
          <input
            type="text"
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-1 border rounded-lg min-w-[300px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlans.map(plan => (
          <div key={plan.firebaseId} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">{plan.name || 'Untitled Plan'}</h3>
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <div>Created: {new Date(plan.createdAt).toLocaleDateString()}</div>
              <div>Modified: {new Date(plan.updatedAt).toLocaleDateString()}</div>
              <div>Exercises: {plan.exercises?.length || 0}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleOpenPlan(plan.firebaseId)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Open Plan
              </button>
              <button
                onClick={() => handleArchivePlan(plan.firebaseId)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                {plan.isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                onClick={() => handleDeletePlan(plan.firebaseId)}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
