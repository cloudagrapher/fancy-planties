'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Download, X, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Shows installation prompts for the Fancy Planties app
 */
export function PWAInstallPrompt() {
  const { isInstallable, isStandalone, promptInstall, dismissPrompt } = usePWAInstall();
  const { triggerHaptic } = useHapticFeedback();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('fancy-planties-install-dismissed');
    if (dismissed) {
      setHasBeenDismissed(true);
    }
  }, []);

  useEffect(() => {
    // Show prompt after a delay if installable and not dismissed
    if (isInstallable && !hasBeenDismissed && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, hasBeenDismissed, isStandalone]);

  const handleInstall = async () => {
    triggerHaptic('medium');
    const result = await promptInstall();
    
    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setShowPrompt(false);
    setHasBeenDismissed(true);
    dismissPrompt();
    localStorage.setItem('fancy-planties-install-dismissed', 'true');
  };

  const handleDismissTemporary = () => {
    triggerHaptic('light');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-96">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-semibold">Install Fancy Planties</h3>
            </div>
            <button
              onClick={handleDismissTemporary}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">
            Get the full app experience! Install Fancy Planties for:
          </p>
          
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
              Offline plant viewing and care logging
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
              Native app experience with faster loading
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
              Home screen access and push notifications
            </li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone Mode Indicator
 * Shows when app is running in standalone mode
 */
export function StandaloneModeIndicator() {
  const { isStandalone } = usePWAInstall();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isStandalone) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isStandalone]);

  if (!showIndicator) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <Smartphone className="w-3 h-3 text-green-600" />
          </div>
          <div>
            <p className="text-green-800 text-sm font-medium">
              App Mode Active
            </p>
            <p className="text-green-700 text-xs">
              Fancy Planties is running as an installed app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}