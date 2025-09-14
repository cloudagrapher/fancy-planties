'use client';

import { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/shared/OptimizedImage';
import type { PlantWithDetails } from '@/lib/db/queries/admin-plants';

interface PlantDetailModalProps {
  plant: PlantWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PlantWithImage {
  defaultImage: string | null;
}

export function PlantDetailModal({ plant, isOpen, onClose }: PlantDetailModalProps) {
  const [plantWithImage, setPlantWithImage] = useState<PlantWithImage | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Fetch plant image only when modal opens
  useEffect(() => {
    if (!plant || !isOpen) {
      setPlantWithImage(null);
      return;
    }

    const fetchPlantImage = async () => {
      setLoadingImage(true);
      try {
        const response = await fetch(`/api/admin/plants/${plant.id}/image`);
        if (response.ok) {
          const data = await response.json();
          setPlantWithImage({ defaultImage: data.defaultImage });
        }
      } catch (error) {
        console.error('Failed to load plant image:', error);
        setPlantWithImage({ defaultImage: null });
      } finally {
        setLoadingImage(false);
      }
    };

    fetchPlantImage();
  }, [plant, isOpen]);

  if (!isOpen || !plant) return null;

  return (
    <div className="plant-detail-modal-overlay" onClick={onClose}>
      <div className="plant-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plant-detail-header">
          <h2>{plant.commonName}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="plant-detail-content">
          <div className="plant-detail-image">
            {loadingImage ? (
              <div className="image-placeholder--loading">
                <div className="spinner" />
                <span>Loading image...</span>
              </div>
            ) : plantWithImage?.defaultImage ? (
              <OptimizedImage
                src={plantWithImage.defaultImage}
                alt={plant.commonName}
                width={300}
                height={225}
                className="plant-image"
                quality={85}
                priority={true}
              />
            ) : (
              <div className="image-placeholder--empty">
                <span>No image available</span>
              </div>
            )}
          </div>

          <div className="plant-detail-info">
            <div className="plant-taxonomy">
              <h3>Taxonomy</h3>
              <div className="taxonomy-grid">
                <div className="taxonomy-item">
                  <strong>Family:</strong> {plant.family}
                </div>
                <div className="taxonomy-item">
                  <strong>Genus:</strong> {plant.genus}
                </div>
                <div className="taxonomy-item">
                  <strong>Species:</strong> {plant.species}
                </div>
                {plant.cultivar && (
                  <div className="taxonomy-item">
                    <strong>Cultivar:</strong> {plant.cultivar}
                  </div>
                )}
              </div>
            </div>

            <div className="plant-stats">
              <h3>Usage Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <strong>{plant.instanceCount}</strong>
                  <span>Plant Instances</span>
                </div>
                <div className="stat-item">
                  <strong>{plant.propagationCount}</strong>
                  <span>Propagations</span>
                </div>
              </div>
            </div>

            {plant.careInstructions && (
              <div className="plant-care">
                <h3>Care Instructions</h3>
                <p>{plant.careInstructions}</p>
              </div>
            )}

            <div className="plant-meta">
              <div className="meta-item">
                <strong>Status:</strong>
                <span className={`status-badge ${plant.isVerified ? 'verified' : 'unverified'}`}>
                  {plant.isVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="meta-item">
                <strong>Created by:</strong> {plant.createdByName || 'Unknown'}
              </div>
              <div className="meta-item">
                <strong>Created:</strong> {new Date(plant.createdAt).toLocaleDateString()}
              </div>
              <div className="meta-item">
                <strong>Updated:</strong> {new Date(plant.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}