import { startChatExpiryWorker, stopChatExpiryWorker } from './chat-expiry.worker';
import { startChatBillingWorker, stopChatBillingWorker } from './chat-billing.worker';
import { startOutboxWorker, stopOutboxWorker } from './outbox.worker';
import { logger } from '../common/utils/logger';

export function startAllWorkers(): void {
  logger.info('Starting background chat and billing workers...');
  startChatExpiryWorker();
  startChatBillingWorker();
  startOutboxWorker();
}

export function stopAllWorkers(): void {
  logger.info('Stopping background chat and billing workers...');
  stopChatExpiryWorker();
  stopChatBillingWorker();
  stopOutboxWorker();
}
