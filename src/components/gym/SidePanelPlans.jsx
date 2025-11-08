import React, { useState, useEffect, useRef } from 'react';
import {
  loadPlansFromFirestore,
  createFolder,
  movePlanToFolder,
  renamePlanOrFolder,
  duplicatePlan,
  toggleArchivePlan,
  deletePlanFromFirestore
} from '../../services/planService';

const SidePanelPlans = ({ isOpen, onClose, onOpenPlan, activePlanId }) => {
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
  const editInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

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
      setItems(allItems);
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

  // Organize items into tree structure
  const organizeTree = () => {
    const filtered = items.filter(item => {
      const matchesArchive = showArchived ? item.isArchived : !item.isArchived;
      const matchesSearch = !searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesArchive && matchesSearch;
    });

    const rootItems = filtered.filter(item => !item.parentFolder);
    return rootItems;
  };

  const getChildItems = (parentId) => {
    return items.filter(item =>
      item.parentFolder === parentId &&
      (showArchived ? item.isArchived : !item.isArchived) &&
      (!searchQuery || item.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
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
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
            isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          } ${isDragging ? 'opacity-40' : ''} ${
            isDropTarget ? 'bg-green-100 border-2 border-green-400 border-dashed' : ''
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
            // Ignore right-clicks, ctrl+clicks, and meta+clicks
            if (e.button !== 0 || e.ctrlKey || e.metaKey) {
              return;
            }

            if (isFolder) {
              toggleFolder(item.firebaseId);
            } else {
              onOpenPlan(item);
            }
          }}
        >
          {isFolder && (
            <span className="text-sm">
              {isExpanded ? '📂' : '📁'}
            </span>
          )}

          {!isFolder && <span className="text-sm">📄</span>}

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => handleRename(item.firebaseId, editingName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(item.firebaseId, editingName);
                } else if (e.key === 'Escape') {
                  setEditingItem(null);
                }
              }}
              className="flex-1 px-2 py-1 border rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 flex justify-between items-center">
              <span className="font-medium text-sm truncate">
                {item.name || 'Untitled'}
              </span>
              {!isFolder && (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{item.exercises?.length || 0} exercises</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
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

  if (!isOpen) return null;

  return (
    <>
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold">Saved Plans</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
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
              className={`flex-1 px-3 py-2 rounded text-sm ${
                !showArchived ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`flex-1 px-3 py-2 rounded text-sm ${
                showArchived ? 'bg-blue-500 text-white' : 'bg-gray-100'
              }`}
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
