'use client';

import { useState, useMemo } from 'react';
import type { TaxonomyNode, TaxonomyStats, TaxonomyPlant } from '@/lib/db/queries/admin-taxonomy';
import { apiFetch } from '@/lib/api-client';

interface TaxonomyManagementClientProps {
  initialHierarchy: TaxonomyNode[];
  stats: TaxonomyStats;
}

type ViewMode = 'hierarchy' | 'duplicates' | 'validation';

export default function TaxonomyManagementClient({
  initialHierarchy,
  stats,
}: TaxonomyManagementClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPlants, setSelectedPlants] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'family' | 'genus' | 'species'>('all');

  // Filter hierarchy based on search and level
  const filteredHierarchy = useMemo(() => {
    if (!searchQuery && filterLevel === 'all') return initialHierarchy;

    return initialHierarchy.filter(family => {
      const matchesSearch = !searchQuery || 
        family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        family.children?.some(genus => 
          genus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          genus.children?.some(species => 
            species.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            species.plants?.some(plant => 
              plant.commonName.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        );

      return matchesSearch;
    });
  }, [initialHierarchy, searchQuery, filterLevel]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const togglePlantSelection = (plantId: number) => {
    const newSelected = new Set(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.add(plantId);
    }
    setSelectedPlants(newSelected);
  };

  const handleMergePlants = async () => {
    if (selectedPlants.size !== 2) {
      alert('Please select exactly 2 plants to merge');
      return;
    }

    const [sourceId, targetId] = Array.from(selectedPlants);
    const reason = prompt('Enter reason for merge:');
    if (!reason) return;

    try {
      const response = await apiFetch('/api/admin/taxonomy/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, reason }),
      });

      if (response.ok) {
        alert('Plants merged successfully');
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to merge plants: ${error.message}`);
      }
    } catch (error) {
      alert('Failed to merge plants');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPlants.size === 0) {
      alert('Please select plants to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedPlants.size} plants?`)) {
      return;
    }

    try {
      const response = await apiFetch('/api/admin/taxonomy/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantIds: Array.from(selectedPlants) }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Deleted ${result.deleted} plants. ${result.errors.length} errors.`);
        if (result.errors.length > 0) {
          console.error('Delete errors:', result.errors);
        }
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to delete plants: ${error.message}`);
      }
    } catch (error) {
      alert('Failed to delete plants');
    }
  };

  return (
    <div className="taxonomy-management">
      {/* Stats Overview */}
      <div className="taxonomy-stats">
        <div className="admin-stats-grid">
          <div className="stat-card">
            <h3>Families</h3>
            <p className="stat-number">{stats.totalFamilies}</p>
          </div>
          <div className="stat-card">
            <h3>Genera</h3>
            <p className="stat-number">{stats.totalGenera}</p>
          </div>
          <div className="stat-card">
            <h3>Species</h3>
            <p className="stat-number">{stats.totalSpecies}</p>
          </div>
          <div className="stat-card">
            <h3>Total Plants</h3>
            <p className="stat-number">{stats.totalPlants}</p>
          </div>
          <div className="stat-card">
            <h3>Verified</h3>
            <p className="stat-number">{stats.verifiedPlants}</p>
          </div>
          <div className="stat-card">
            <h3>Duplicates</h3>
            <p className="stat-number">{stats.duplicateCandidates.length}</p>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="view-mode-tabs">
        <button
          className={`tab ${viewMode === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setViewMode('hierarchy')}
        >
          Hierarchy View
        </button>
        <button
          className={`tab ${viewMode === 'duplicates' ? 'active' : ''}`}
          onClick={() => setViewMode('duplicates')}
        >
          Duplicates ({stats.duplicateCandidates.length})
        </button>
        <button
          className={`tab ${viewMode === 'validation' ? 'active' : ''}`}
          onClick={() => setViewMode('validation')}
        >
          Validation Tools
        </button>
      </div>

      {/* Controls */}
      <div className="taxonomy-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search taxonomy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as 'all' | 'family' | 'genus' | 'species')}
            className="filter-select"
          >
            <option value="all">All Levels</option>
            <option value="family">Families</option>
            <option value="genus">Genera</option>
            <option value="species">Species</option>
          </select>
        </div>

        {selectedPlants.size > 0 && (
          <div className="bulk-actions">
            <span>{selectedPlants.size} plants selected</span>
            <button onClick={handleMergePlants} disabled={selectedPlants.size !== 2}>
              Merge Plants
            </button>
            <button onClick={handleBulkDelete} className="danger">
              Delete Selected
            </button>
            <button onClick={() => setSelectedPlants(new Set())}>
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'hierarchy' && (
        <div className="taxonomy-hierarchy">
          {filteredHierarchy.map(family => (
            <TaxonomyNodeComponent
              key={family.id}
              node={family}
              expandedNodes={expandedNodes}
              selectedPlants={selectedPlants}
              onToggleNode={toggleNode}
              onTogglePlant={togglePlantSelection}
            />
          ))}
        </div>
      )}

      {viewMode === 'duplicates' && (
        <div className="duplicates-view">
          <h3>Potential Duplicate Plants</h3>
          <div className="duplicates-list">
            {stats.duplicateCandidates.map(plant => (
              <div key={plant.id} className="duplicate-item">
                <input
                  type="checkbox"
                  checked={selectedPlants.has(plant.id)}
                  onChange={() => togglePlantSelection(plant.id)}
                />
                <div className="plant-info">
                  <strong>{plant.commonName}</strong>
                  <span className="taxonomy">
                    {plant.genus} {plant.species}
                    {plant.cultivar && ` '${plant.cultivar}'`}
                  </span>
                  <span className="stats">
                    {plant.instanceCount} instances, {plant.propagationCount} propagations
                  </span>
                  <span className={`status ${plant.isVerified ? 'verified' : 'unverified'}`}>
                    {plant.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'validation' && (
        <div className="validation-tools">
          <h3>Taxonomy Validation Tools</h3>
          <p>Validation tools will be implemented here</p>
        </div>
      )}
    </div>
  );
}

interface TaxonomyNodeComponentProps {
  node: TaxonomyNode;
  expandedNodes: Set<string>;
  selectedPlants: Set<number>;
  onToggleNode: (nodeId: string) => void;
  onTogglePlant: (plantId: number) => void;
}

function TaxonomyNodeComponent({
  node,
  expandedNodes,
  selectedPlants,
  onToggleNode,
  onTogglePlant,
}: TaxonomyNodeComponentProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const hasPlants = node.plants && node.plants.length > 0;

  return (
    <div className={`taxonomy-node level-${node.level}`}>
      <div className="node-header" onClick={() => onToggleNode(node.id)}>
        <span className="expand-icon">
          {hasChildren || hasPlants ? (isExpanded ? '▼' : '▶') : '•'}
        </span>
        <span className="node-name">{node.name}</span>
        <span className="node-stats">
          {node.plantCount} plants, {node.instanceCount} instances
        </span>
      </div>

      {isExpanded && (
        <div className="node-content">
          {/* Render child nodes */}
          {hasChildren && (
            <div className="child-nodes">
              {node.children!.map(child => (
                <TaxonomyNodeComponent
                  key={child.id}
                  node={child}
                  expandedNodes={expandedNodes}
                  selectedPlants={selectedPlants}
                  onToggleNode={onToggleNode}
                  onTogglePlant={onTogglePlant}
                />
              ))}
            </div>
          )}

          {/* Render plants */}
          {hasPlants && (
            <div className="node-plants">
              {node.plants!.map(plant => (
                <div key={plant.id} className="plant-item">
                  <input
                    type="checkbox"
                    checked={selectedPlants.has(plant.id)}
                    onChange={() => onTogglePlant(plant.id)}
                  />
                  <div className="plant-details">
                    <strong>{plant.commonName}</strong>
                    {plant.cultivar && <span className="cultivar">'{plant.cultivar}'</span>}
                    <span className="usage">
                      {plant.instanceCount}i, {plant.propagationCount}p
                    </span>
                    <span className={`verification ${plant.isVerified ? 'verified' : 'unverified'}`}>
                      {plant.isVerified ? '✓' : '?'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}