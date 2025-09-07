'use client';

import { useState } from 'react';
import { Modal, ModalWithTabs, ConfirmationModal, Drawer, ActionSheet } from './index';

export default function ModalDemo() {
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [tabModalOpen, setTabModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    setIsLoading(true);
    // Simulate async operation
    setTimeout(() => {
      setIsLoading(false);
      setConfirmModalOpen(false);
      alert('Action confirmed!');
    }, 2000);
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '🌱',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plant Overview</h3>
          <p>This is the overview tab content with plant information.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-mint-50 rounded-lg">
              <h4 className="font-medium text-mint-700">Health Status</h4>
              <p className="text-sm text-mint-600">Excellent</p>
            </div>
            <div className="p-4 bg-salmon-50 rounded-lg">
              <h4 className="font-medium text-salmon-700">Last Watered</h4>
              <p className="text-sm text-salmon-600">2 days ago</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'care',
      label: 'Care History',
      icon: '💧',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Care History</h3>
          <div className="space-y-3">
            {[
              { date: '2024-01-15', action: 'Watered', notes: 'Regular watering' },
              { date: '2024-01-10', action: 'Fertilized', notes: 'Monthly fertilizer' },
              { date: '2024-01-08', action: 'Pruned', notes: 'Removed dead leaves' },
            ].map((entry, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-sm text-gray-600">{entry.notes}</p>
                  </div>
                  <span className="text-xs text-gray-500">{entry.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: '📝',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plant Notes</h3>
          <textarea
            className="form-input"
            rows={6}
            placeholder="Add your notes about this plant..."
            defaultValue="This plant is doing really well in the bright indirect light by the window. Need to remember to rotate it weekly for even growth."
          />
          <button className="btn btn--primary">Save Notes</button>
        </div>
      ),
    },
  ];

  const actionSheetActions = [
    {
      id: 'water',
      label: 'Water Plant',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1m0 18v2m8-10h2m-2 4h2m-2-8h2m-2-4h2" />
        </svg>
      ),
      onClick: () => alert('Plant watered!'),
    },
    {
      id: 'fertilize',
      label: 'Add Fertilizer',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      ),
      onClick: () => alert('Fertilizer added!'),
    },
    {
      id: 'repot',
      label: 'Repot Plant',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      onClick: () => alert('Plant repotted!'),
    },
    {
      id: 'delete',
      label: 'Delete Plant',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      variant: 'danger' as const,
      onClick: () => alert('Plant deleted!'),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Modal & Navigation Demo</h1>
        <p className="text-gray-600">Showcasing the new mobile-first modal and navigation system</p>
      </div>

      {/* Demo Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Basic Modal</h3>
            <p className="text-gray-600 mb-4">Simple modal with title and content</p>
            <button
              onClick={() => setBasicModalOpen(true)}
              className="btn btn--primary btn--full"
            >
              Open Basic Modal
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Tabbed Modal</h3>
            <p className="text-gray-600 mb-4">Modal with multiple tabs for complex content</p>
            <button
              onClick={() => setTabModalOpen(true)}
              className="btn btn--secondary btn--full"
            >
              Open Tabbed Modal
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Confirmation Modal</h3>
            <p className="text-gray-600 mb-4">Modal for confirming destructive actions</p>
            <button
              onClick={() => setConfirmModalOpen(true)}
              className="btn btn--danger btn--full"
            >
              Open Confirmation
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Bottom Drawer</h3>
            <p className="text-gray-600 mb-4">Mobile-optimized slide-up drawer</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="btn btn--tertiary btn--full"
            >
              Open Drawer
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Action Sheet</h3>
            <p className="text-gray-600 mb-4">Quick actions in a bottom sheet</p>
            <button
              onClick={() => setActionSheetOpen(true)}
              className="btn btn--outline btn--full"
            >
              Open Action Sheet
            </button>
          </div>
        </div>

        <div className="card card--mint">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3">Navigation</h3>
            <p className="text-gray-600 mb-4">Check the bottom navigation on mobile</p>
            <div className="text-sm text-mint-700 font-medium">
              ✓ Active on mobile devices
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={basicModalOpen}
        onClose={() => setBasicModalOpen(false)}
        title="Basic Modal Example"
      >
        <div className="space-y-4">
          <p>This is a basic modal with a title and some content. It demonstrates the mobile-first design with:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Slide-up animation on mobile</li>
            <li>Scale-in animation on desktop</li>
            <li>Backdrop blur effect</li>
            <li>Safe area support for iOS devices</li>
            <li>Touch-optimized close button</li>
          </ul>
          <div className="p-4 bg-mint-50 rounded-lg">
            <p className="text-mint-700 font-medium">Mobile-First Design</p>
            <p className="text-mint-600 text-sm">This modal adapts to different screen sizes automatically.</p>
          </div>
        </div>
      </Modal>

      <ModalWithTabs
        isOpen={tabModalOpen}
        onClose={() => setTabModalOpen(false)}
        title="Plant Details"
        size="large"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirm}
        title="Delete Plant"
        message="Are you sure you want to delete this plant? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isLoading}
      />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Plant Care Options"
        position="bottom"
        height="auto"
      >
        <div className="space-y-4">
          <p className="text-gray-600">This drawer slides up from the bottom and is perfect for mobile interactions.</p>
          
          <div className="space-y-3">
            <button className="btn btn--primary btn--full">
              💧 Water Plant
            </button>
            <button className="btn btn--secondary btn--full">
              🌱 Add Fertilizer
            </button>
            <button className="btn btn--tertiary btn--full">
              📝 Add Notes
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Swipe handle for easy interaction</li>
              <li>• Safe area support</li>
              <li>• Backdrop blur</li>
              <li>• Touch-optimized buttons</li>
            </ul>
          </div>
        </div>
      </Drawer>

      <ActionSheet
        isOpen={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        title="Plant Actions"
        actions={actionSheetActions}
      />
    </div>
  );
}