// Export all query utilities
export { UserQueries } from './users';
export { PlantQueries } from './plants';
export { PlantInstanceQueries } from './plant-instances';
export { PropagationQueries } from './propagations';
export { SessionQueries } from './sessions';

// Re-export database utilities
export { 
  db, 
  checkDatabaseConnection, 
  setUserContext, 
  clearUserContext, 
  withTransaction, 
  closeDatabaseConnection 
} from '../index';

// Re-export schema types
export type {
  User,
  NewUser,
  Plant,
  NewPlant,
  PlantInstance,
  NewPlantInstance,
  Propagation,
  NewPropagation,
  Session,
  NewSession
} from '../schema';