'use client';

import { useState } from 'react';
import Image from 'next/image';
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
      nextStatus: 'planted',
      nextLabel: 'Mark as Planted'
    },
    planted: {
      label: 'Planted',
      icon: Clock,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      nextStatus: 'established',
      nextLabel: 'Mark as Established'
    },
    established: {
      label: 'Established',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-200',
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
      
      const response = await fetch(`/api/propagations/${propagation.id}/status`, {
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
      const response = await fetch(`/api/propagations/${propagation.id}`, {
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
      const response = await fetch(`/api/propagations/${propagation.id}/convert`, {
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          {/* Left side - Image and basic info */}
          <div className="flex items-start space-x-4 flex-1">
            {/* Propagation image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {propagation.images && propagation.images.length > 0 ? (
                <Image
                  src={propagation.images[0]}
                  alt={propagation.nickname}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <StatusIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Propagation details */}
            <div className="flex-1 min-w-0">
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

                {/* Status badge */}
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStatus.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {currentStatus.label}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {daysSinceStarted} days ago
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {propagation.location}
                </div>
                
                {/* Source type indicator */}
                {(propagation as any).sourceType === 'internal' && propagation.parentInstance && (
                  <div className="flex items-center">
                    <TreePine className="w-4 h-4 mr-1" />
                    From: {propagation.parentInstance.nickname}
                  </div>
                )}
                
                {(propagation as any).sourceType === 'external' && (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-1 flex items-center justify-center">
                      {(propagation as any).externalSource === 'gift' && '🎁'}
                      {(propagation as any).externalSource === 'trade' && '🔄'}
                      {(propagation as any).externalSource === 'purchase' && '🛒'}
                      {(propagation as any).externalSource === 'other' && '📦'}
                    </div>
                    {(propagation as any).externalSource === 'gift' && 'Gift'}
                    {(propagation as any).externalSource === 'trade' && 'Trade'}
                    {(propagation as any).externalSource === 'purchase' && 'Purchase'}
                    {(propagation as any).externalSource === 'other' && 'Other source'}
                  </div>
                )}
              </div>
              
              {/* External source details */}
              {(propagation as any).sourceType === 'external' && (propagation as any).externalSourceDetails && (
                <div className="mt-1 text-xs text-gray-500">
                  {(propagation as any).externalSourceDetails}
                </div>
              )}

              {/* Notes preview */}
              {propagation.notes && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {propagation.notes}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2 ml-4">
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

            {/* Convert to plant button (for established propagations) */}
            {propagation.status === 'established' && (
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