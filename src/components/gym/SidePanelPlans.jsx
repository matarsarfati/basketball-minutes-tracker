import React, { useState, useEffect, useRef } from 'react';
import {
  loadPlansFromFirestore,
  createFolder,
  movePlanToFolder,
  renamePlanOrFolder,
  duplicatePlan,
  toggleArchivePlan,
  deletePlanFromFirestore,
  getFoldersWithSystem
} from '../../services/planService';

const SidePanelPlans = ({ isOpen, onClose, onOpenPlan, activePlanId, refreshToken }) => {
  const [items, setItems] = useState([]); // All plans and folders
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [listEditMode, setListEditMode] = useState(false);
  const editInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, refreshToken]); // reload when parent signals a save

  useEffect(() => {
    if (editingItem && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItem]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const allItems = await loadPlansFromFirestore();
      // Merge with system folders (Individual is always present)
      setItems(getFoldersWithSystem(allItems));
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const newFolder = await createFolder(folderName);
      setItems([...items, newFolder]);
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleRename = async (itemId, newName) => {
    if (!newName.trim()) return;

    try {
      await renamePlanOrFolder(itemId, newName.trim());
      setItems(items.map(item =>
        item.firebaseId === itemId ? { ...item, name: newName.trim() } : item
      ));
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to rename:', error);
      alert('Failed to rename item');
    }
  };

  const handleDuplicate = async (plan) => {
    try {
      console.log('Starting plan duplication for:', plan.name);
      const duplicated = await duplicatePlan(plan);
      console.log('Duplication successful, adding to items list');
      setItems([...items, duplicated]);
      console.log('✅ Plan duplicated and added to list');
    } catch (error) {
      console.error('❌ Failed to duplicate plan:', error);
      console.error('Plan object:', plan);
      alert(`Failed to duplicate plan: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMoveTo = async (planId, folderId) => {
    try {
      await movePlanToFolder(planId, folderId);
      setItems(items.map(item =>
        item.firebaseId === planId ? { ...item, parentFolder: folderId } : item
      ));
    } catch (error) {
      console.error('Failed to move plan:', error);
      alert('Failed to move plan');
    }
  };

  const handleToggleArchive = async (itemId, currentState) => {
    try {
      await toggleArchivePlan(itemId, currentState);
      setItems(items.map(item =>
        item.firebaseId === itemId ? { ...item, isArchived: !currentState } : item
      ));
    } catch (error) {
      console.error('Failed to toggle archive:', error);
      alert('Failed to archive/unarchive item');
    }
  };

  const handleDelete = async (itemId, isFolder) => {
    const confirmMessage = isFolder
      ? 'Delete this folder and all its contents?'
      : 'Delete this plan permanently?';

    if (!window.confirm(confirmMessage)) return;

    try {
      await deletePlanFromFirestore(itemId);

      if (isFolder) {
        // Also delete all items in the folder
        const childItems = items.filter(item => item.parentFolder === itemId);
        await Promise.all(childItems.map(child => deletePlanFromFirestore(child.firebaseId)));
        setItems(items.filter(item =>
          item.firebaseId !== itemId && item.parentFolder !== itemId
        ));
      } else {
        setItems(items.filter(item => item.firebaseId !== itemId));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete item');
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent onClick from firing
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    if (item.type === 'folder') return; // Don't allow dragging folders
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
    e.target.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, targetItem) => {
    if (!draggedItem || draggedItem.firebaseId === targetItem.firebaseId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only allow dropping on folders or root
    if (targetItem.type === 'folder') {
      setDropTarget(targetItem.firebaseId);
    }
  };

  const handleDragLeave = (e) => {
    // Check if we're leaving the element entirely (not just entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // Can only drop on folders
    if (targetItem.type !== 'folder') {
      setDropTarget(null);
      return;
    }

    // Don't drop on same folder
    if (draggedItem.parentFolder === targetItem.firebaseId) {
      setDropTarget(null);
      return;
    }

    console.log(`📦 Moving "${draggedItem.name}" to folder "${targetItem.name}"`);

    try {
      await handleMoveTo(draggedItem.firebaseId, targetItem.firebaseId);
      console.log('✅ Plan moved successfully');
    } catch (error) {
      console.error('Failed to move plan:', error);
    }

    setDropTarget(null);
  };

  const handleDropOnRoot = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // Don't drop if already in root
    if (!draggedItem.parentFolder) {
      setDropTarget(null);
      return;
    }

    console.log(`📦 Moving "${draggedItem.name}" to root`);

    try {
      await handleMoveTo(draggedItem.firebaseId, null);
      console.log('✅ Plan moved to root successfully');
    } catch (error) {
      console.error('Failed to move plan to root:', error);
    }

    setDropTarget(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    };

    if (contextMenu) {
      // Small delay to prevent immediate closing from the same click that opened it
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  const getIsArchived = (item) => {
    if (item.isArchived) return true;
    if (item.type !== 'folder') {
      const dateStr = item.updatedAt || item.createdAt;
      if (dateStr) {
        const date = dateStr.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
        const diffTime = Math.abs(new Date() - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return true;
      }
    }
    return false;
  };

  const organizeTree = () => {
    const filtered = items.filter(item => {
      const itemArchived = getIsArchived(item);
      const matchesArchive = showArchived ? itemArchived : !itemArchived;
      const matchesSearch = !searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesArchive && matchesSearch;
    });

    // Root items: system folders first, then real root folders, excluding individual plans
    // (individual plans are shown under the __individual__ virtual folder)
    const rootItems = filtered.filter(item => {
      if (item.isSystem) return true; // Always show system folders at root
      if (item.parentFolder) return false; // Non-root items belong to a folder
      // Hide individual plans from root — they live under the virtual Individual folder
      if (item.type === 'individual' || item.folder === 'Individual') return false;
      return true;
    });
    return rootItems;
  };

  /**
   * Get child items for a folder.
   * For the virtual '__individual__' system folder, returns all individual-type plans
   * (matched by type:'individual' OR folder:'Individual') regardless of parentFolder.
   */
  const getChildItems = (parentId) => {
    if (parentId === '__individual__') {
      // Virtual folder: collect all individual plans from items
      return items.filter(item => {
        if (item.type === 'folder' || item.isSystem) return false;
        const isIndividual = item.type === 'individual' || item.folder === 'Individual';
        if (!isIndividual) return false;
        const itemArchived = getIsArchived(item);
        return (showArchived ? itemArchived : !itemArchived) &&
          (!searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      });
    }
    return items.filter(item => {
      if (item.isSystem) return false;
      const itemArchived = getIsArchived(item);
      return item.parentFolder === parentId &&
        (showArchived ? itemArchived : !itemArchived) &&
        (!searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  };

  const renderItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.firebaseId);
    const isActive = item.firebaseId === activePlanId;
    const childItems = isFolder ? getChildItems(item.firebaseId) : [];
    const isEditing = editingItem === item.firebaseId;
    const isDragging = draggedItem?.firebaseId === item.firebaseId;
    const isDropTarget = dropTarget === item.firebaseId;

    return (
      <div key={item.firebaseId}>
        <div
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            } ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'bg-green-100 border-2 border-green-400 border-dashed' : ''
            }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          draggable={!isFolder && !isEditing}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          onClick={(e) => {
            if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
            if (isFolder) {
              toggleFolder(item.firebaseId);
            } else {
              setPreviewPlan(item);
            }
          }}
        >
          {isFolder && <span className="text-sm">{isExpanded ? '📂' : '📁'}</span>}
          {!isFolder && <span className="text-sm">📄</span>}

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(item.firebaseId, editingName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(item.firebaseId, editingName);
                else if (e.key === 'Escape') setEditingItem(null);
              }}
              className="flex-1 px-2 py-1 border rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 flex justify-between items-center min-w-0">
              <span className="font-medium text-sm truncate">{item.name || 'Untitled'}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isFolder && (
                  <span className="text-xs text-gray-400">{item.exercises?.length || 0} exs</span>
                )}
                {listEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.firebaseId, isFolder);
                    }}
                    className="ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded w-5 h-5 flex items-center justify-center transition-colors"
                    title="Delete permanently"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isFolder && isExpanded && childItems.length > 0 && (
          <div>
            {childItems.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const [previewPlan, setPreviewPlan] = useState(null);

  if (!isOpen) return null;

  return (
    <>
      <div className="last-plans-drawer flex flex-col h-[100vh] w-[50vw] fixed left-0 top-0 z-[100] bg-white shadow-2xl border-r">

        {/* TOP HALF = LIST DIRECTORY */}
        <div className="plans-list-container h-[50%] flex flex-col bg-white border-b border-slate-200">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold">Last Plans</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setListEditMode(m => !m)}
                className={`text-xs px-2 py-1 rounded font-medium transition-colors ${listEditMode ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
              >
                {listEditMode ? '✓ Done' : '✏ Edit'}
              </button>
              <button
                onClick={onClose}
                className="text-xl hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
                title="Close Last Plans"
              >
                ×
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-b space-y-3">
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowArchived(false)}
                className={`flex-1 px-3 py-2 rounded text-sm ${!showArchived ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`flex-1 px-3 py-2 rounded text-sm ${showArchived ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              >
                Archived
              </button>
            </div>

            <button
              onClick={handleCreateFolder}
              className="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
            >
              + New Folder
            </button>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading plans...</div>
              </div>
            ) : organizeTree().length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No plans found
              </div>
            ) : (
              <div>
                {/* Root Drop Zone */}
                {draggedItem && draggedItem.parentFolder && (
                  <div
                    className="mx-3 my-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors text-center text-sm text-gray-600"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={handleDropOnRoot}
                  >
                    📂 Drop here to move to root
                  </div>
                )}
                {organizeTree().map(item => renderItem(item))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM HALF = PLAN PREVIEW */}
        <div className="plan-preview-container h-[50%] flex flex-col bg-slate-50 relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-xl hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center z-10"
            title="Close Last Plans"
          >
            ×
          </button>
          {previewPlan ? (
            <div className="flex flex-col h-full overflow-y-auto relative">
              {/* Header Preview */}
              <div className="p-6 bg-white border-b shadow-sm shrink-0 sticky top-0 z-10 w-full lg:pr-14">
                <h3 className="text-2xl font-bold mb-4 break-words text-gray-800">
                  {previewPlan.name}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-4">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {previewPlan.exercises?.length || 0} Block Elements
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {previewPlan.updatedAt
                      ? new Date(previewPlan.updatedAt.seconds ? previewPlan.updatedAt.toDate() : previewPlan.updatedAt).toLocaleDateString()
                      : new Date(previewPlan.createdAt).toLocaleDateString()
                    }
                  </span>
                </div>
                <button
                  onClick={() => {
                    onOpenPlan({ ...previewPlan, id: previewPlan.firebaseId || previewPlan.id });
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 border border-transparent transition-all text-sm w-full"
                >
                  ✏️ Open in Builder
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-6 space-y-4">
                {previewPlan.exercises?.map((exercise, index) => {
                  if (exercise.type === 'break') {
                    return (
                      <div key={index} className="pt-4 border-b pb-2">
                        <h4 className="text-lg font-bold text-gray-700">{exercise.title || 'Block'}</h4>
                      </div>
                    );
                  }
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border flex gap-4 items-center">
                      {exercise.imageUrl && (
                        <img src={exercise.imageUrl} alt={exercise.name} className="w-16 h-16 object-contain rounded-md bg-gray-50" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-800 truncate text-sm">{exercise.name || 'Unknown Exercise'}</h5>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-gray-800">{exercise.sets || '-'}</span> sets × <span className="font-medium text-gray-800">{exercise.reps || '-'}</span> {exercise.repType || 'reps'}
                        </p>
                        {exercise.notes && <p className="text-xs text-gray-500 truncate mt-1 italic">{exercise.notes}</p>}
                      </div>
                    </div>
                  );
                })}
                {!previewPlan.exercises?.length && (
                  <div className="text-center text-gray-400 py-10">This plan has no content yet.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50">
              <div className="text-6xl mb-4 opacity-50">📄</div>
              <p>Select a plan from the list to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white shadow-lg rounded-lg border py-1 z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => {
              setEditingItem(contextMenu.item.firebaseId);
              setEditingName(contextMenu.item.name);
              closeContextMenu();
            }}
          >
            ✏️ Rename
          </button>

          {contextMenu.item.type !== 'folder' && (
            <>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  handleDuplicate(contextMenu.item);
                  closeContextMenu();
                }}
              >
                📋 Duplicate
              </button>

              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  const folders = items.filter(item => item.type === 'folder');
                  if (folders.length === 0) {
                    alert('No folders available. Create a folder first.');
                    closeContextMenu();
                    return;
                  }
                  setItemToMove(contextMenu.item);
                  setShowMoveModal(true);
                  closeContextMenu();
                }}
              >
                📁 Move to Folder
              </button>
            </>
          )}

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => {
              handleToggleArchive(
                contextMenu.item.firebaseId,
                contextMenu.item.isArchived
              );
              closeContextMenu();
            }}
          >
            {contextMenu.item.isArchived ? '📤 Unarchive' : '📥 Archive'}
          </button>

          <hr className="my-1" />

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600"
            onClick={() => {
              handleDelete(
                contextMenu.item.firebaseId,
                contextMenu.item.type === 'folder'
              );
              closeContextMenu();
            }}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Move to Folder Modal */}
      {showMoveModal && itemToMove && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setShowMoveModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Move "{itemToMove.name}" to Folder</h3>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  handleMoveTo(itemToMove.firebaseId, null);
                  setShowMoveModal(false);
                }}
                className="w-full px-4 py-2 text-left border rounded hover:bg-gray-50"
              >
                📂 Root (No Folder)
              </button>

              {items
                .filter(item => item.type === 'folder' && item.firebaseId !== itemToMove.firebaseId)
                .map(folder => (
                  <button
                    key={folder.firebaseId}
                    onClick={() => {
                      handleMoveTo(itemToMove.firebaseId, folder.firebaseId);
                      setShowMoveModal(false);
                    }}
                    className="w-full px-4 py-2 text-left border rounded hover:bg-gray-50"
                  >
                    📁 {folder.name}
                  </button>
                ))}
            </div>

            <button
              onClick={() => setShowMoveModal(false)}
              className="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SidePanelPlans;
