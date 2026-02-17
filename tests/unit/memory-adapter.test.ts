import { MemoryAdapter } from '../../src/storage/memory-adapter';
import { runStorageContractTests } from './storage-contract';

runStorageContractTests('MemoryAdapter', () => new MemoryAdapter());
