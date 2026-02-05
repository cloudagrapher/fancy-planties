'use client';

import { useState } from 'react';
import Image from 'next/image';
import { shouldUnoptimizeImage } from '@/lib/image-loader';
import { 
  Calendar, 
  MapPin, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ArrowRight,
  Sprout,
  TrendingUp,
  Clock,
  CheckCircle,
  TreePine
} from 'lucide-react';
import PropagationForm from './PropagationForm';
import type { Propagation, Plant, PlantInstance } from '@/lib/db/schema';
import { apiFetch } from '@/lib/api-client';

interface PropagationWithDetails extends Propagation {
  plant: Plant;
  parentInstance?: PlantInstance;
}

interface PropagationCardProps {
  propagation: PropagationWithDetails;
  onUpdate: () => void;
}

export default function PropagationCard({ propagation, onUpdate }: PropagationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Status configuration
  const statusConfig = {
    started: {
      label: 'Started',
      icon: Sprout,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      nextStatus: 'rooting',
      nextLabel: 'Mark as Rooting'
    },
    rooting: {
      label: 'Rooting',
      icon: TrendingUp,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      nextStatus: 'ready',
      nextLabel: 'Mark as Ready'
    },
    ready: {
      label: 'Ready',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-200',
      nextStatus: 'planted',
      nextLabel: 'Convert to Plant'
    },
    planted: {
      label: 'Planted',
      icon: TreePine,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      nextStatus: null,
      nextLabel: null
    }
  };

  const currentStatus = statusConfig[propagation.status as keyof typeof statusConfig];
  const StatusIcon = currentStatus.icon;

  // Calculate days since started
  const daysSinceStarted = Math.floor(
    (new Date().getTime() - new Date(propagation.dateStarted).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const response = await apiFetch(`/api/propagations/${propagation.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status updated to ${newStatus} on ${new Date().toDateString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      onUpdate();
      setShowMenu(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update propagation status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const response = await apiFetch(`/api/propagations/${propagation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete propagation');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting propagation:', error);
      alert('Failed to delete propagation');
    }
  };

  // Handle convert to plant instance
  const handleConvertToPlant = async () => {
    try {
      const response = await apiFetch(`/api/propagations/${propagation.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: propagation.nickname,
          location: propagation.location,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert propagation');
      }

      const result = await response.json();
      alert(`Successfully converted to plant instance #${result.plantInstanceId}`);
      onUpdate();
      setShowConvertModal(false);
    } catch (error) {
      console.error('Error converting propagation:', error);
      alert('Failed to convert propagation to plant instance');
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
        {/* Mobile-first layout */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
          {/* Top section - Image, name, and status */}
          <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
            {/* Propagation image */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {propagation.images && Array.isArray(propagation.images) && propagation.images.length > 0 ? (
                propagation.images[0].startsWith('data:') ? (
                  <img
                    src={propagation.images[0]}
                    alt={propagation.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={propagation.images[0]}
                    alt={propagation.nickname}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={shouldUnoptimizeImage(propagation.images[0])}
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <StatusIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
              )}
            </div>

            {/* Propagation details */}
            <div className="flex-1 min-w-0">
              {/* Mobile layout - stacked */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate flex-1 pr-2">
                    {propagation.nickname}
                  </h3>
                  {/* Mobile status badge - compact */}
                  <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${currentStatus.color} flex-shrink-0`}>
                    <StatusIcon className="w-2.5 h-2.5 mr-1" />
                    <span className="hidden xs:inline">{currentStatus.label}</span>
                    <span className="xs:hidden">
                      {currentStatus.label === 'Started' && 'Start'}
                      {currentStatus.label === 'Rooting' && 'Root'}
                      {currentStatus.label === 'Ready' && 'Ready'}
                      {currentStatus.label === 'Planted' && 'Plant'}
                    </span>
                  </div>
                </div>
                {/* Hide scientific name on mobile */}
                <div className="text-xs text-gray-500 mb-2">
                  {propagation.plant.commonName || `${propagation.plant.genus} ${propagation.plant.species}`}
                </div>
              </div>

              {/* Desktop layout - traditional */}
              <div className="hidden sm:block">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {propagation.nickname}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {propagation.plant.genus} {propagation.plant.species}
                    </p>
                    {propagation.plant.commonName && (
                      <p className="text-sm text-gray-500">
                        {propagation.plant.commonName}
                      </p>
                    )}
                  </div>

                  {/* Desktop status badge */}
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStatus.color} flex-shrink-0 ml-4`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {currentStatus.label}
                  </div>
                </div>
              </div>

              {/* Metadata - responsive */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="sm:hidden">{daysSinceStarted}d</span>
                  <span className="hidden sm:inline">{daysSinceStarted} days ago</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="truncate max-w-20 sm:max-w-none">{propagation.location}</span>
                </div>
                
                {/* Source type indicator - simplified on mobile */}
                {(propagation as any).sourceType === 'internal' && propagation.parentInstance && (
                  <div className="flex items-center">
                    <TreePine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="sm:hidden">Parent</span>
                    <span className="hidden sm:inline">From: {propagation.parentInstance.nickname}</span>
                  </div>
                )}
                
                {(propagation as any).sourceType === 'external' && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex items-center justify-center text-xs">
                      {(propagation as any).externalSource === 'gift' && '🎁'}
                      {(propagation as any).externalSource === 'trade' && '🔄'}
                      {(propagation as any).externalSource === 'purchase' && '🛒'}
                      {(propagation as any).externalSource === 'other' && '📦'}
                    </div>
                    <span className="sm:hidden">
                      {(propagation as any).externalSource === 'gift' && 'Gift'}
                      {(propagation as any).externalSource === 'trade' && 'Trade'}
                      {(propagation as any).externalSource === 'purchase' && 'Buy'}
                      {(propagation as any).externalSource === 'other' && 'Other'}
                    </span>
                    <span className="hidden sm:inline">
                      {(propagation as any).externalSource === 'gift' && 'Gift'}
                      {(propagation as any).externalSource === 'trade' && 'Trade'}
                      {(propagation as any).externalSource === 'purchase' && 'Purchase'}
                      {(propagation as any).externalSource === 'other' && 'Other source'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* External source details */}
              {(propagation as any).sourceType === 'external' && (propagation as any).externalSourceDetails && (
                <div className="mt-1 text-xs text-gray-500">
                  {(propagation as any).externalSourceDetails}
                </div>
              )}

              {/* Notes preview - hidden on mobile */}
              {propagation.notes && (
                <p className="hidden sm:block text-sm text-gray-600 mt-2 line-clamp-2">
                  {propagation.notes}
                </p>
              )}
            </div>
          </div>

          {/* Actions - mobile responsive */}
          <div className="mt-3 sm:mt-0 sm:ml-4">
            {/* Mobile actions - stacked layout */}
            <div className="sm:hidden flex flex-col gap-2">
              {/* Primary action button */}
              {currentStatus.nextStatus && (
                <button
                  onClick={() => handleStatusUpdate(currentStatus.nextStatus!)}
                  disabled={isUpdatingStatus}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 min-h-[36px] touch-action-manipulation"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {isUpdatingStatus ? 'Updating...' : (
                    currentStatus.nextStatus === 'rooting' ? 'Mark Rooting' :
                    currentStatus.nextStatus === 'ready' ? 'Mark Ready' :
                    currentStatus.nextStatus === 'planted' ? 'Convert' :
                    currentStatus.nextLabel
                  )}
                </button>
              )}

              {/* Convert button for ready - mobile */}
              {propagation.status === 'ready' && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors min-h-[36px] touch-action-manipulation"
                >
                  <TreePine className="w-4 h-4 mr-1" />
                  Convert to Plant
                </button>
              )}

              {/* Secondary actions in a row */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowEditForm(true)}
                  className="flex items-center justify-center px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop actions - horizontal layout */}
            <div className="hidden sm:flex items-center space-x-2">
              {/* Quick status update button */}
              {currentStatus.nextStatus && (
                <button
                  onClick={() => handleStatusUpdate(currentStatus.nextStatus!)}
                  disabled={isUpdatingStatus}
                  className="flex items-center px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  {isUpdatingStatus ? 'Updating...' : currentStatus.nextLabel}
                </button>
              )}

              {/* Convert to plant button (for ready propagations) */}
              {propagation.status === 'ready' && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <TreePine className="w-4 h-4 mr-1" />
                  Convert to Plant
                </button>
              )}

              {/* Menu button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        setShowEditForm(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4 mr-3" />
                      Edit Details
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-3" />
                      Delete Propagation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <PropagationForm
          propagation={propagation}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            onUpdate();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Propagation
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{propagation.nickname}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Plant Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Convert to Plant Instance
            </h3>
            <p className="text-gray-600 mb-6">
              This will create a new plant instance from "{propagation.nickname}" and mark the propagation as established.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToPlant}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Convert to Plant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}