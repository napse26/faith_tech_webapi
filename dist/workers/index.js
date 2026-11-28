"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAllWorkers = startAllWorkers;
exports.stopAllWorkers = stopAllWorkers;
const chat_expiry_worker_1 = require("./chat-expiry.worker");
const chat_billing_worker_1 = require("./chat-billing.worker");
const outbox_worker_1 = require("./outbox.worker");
const logger_1 = require("../common/utils/logger");
function startAllWorkers() {
    logger_1.logger.info('Starting background chat and billing workers...');
    (0, chat_expiry_worker_1.startChatExpiryWorker)();
    (0, chat_billing_worker_1.startChatBillingWorker)();
    (0, outbox_worker_1.startOutboxWorker)();
}
function stopAllWorkers() {
    logger_1.logger.info('Stopping background chat and billing workers...');
    (0, chat_expiry_worker_1.stopChatExpiryWorker)();
    (0, chat_billing_worker_1.stopChatBillingWorker)();
    (0, outbox_worker_1.stopOutboxWorker)();
}
