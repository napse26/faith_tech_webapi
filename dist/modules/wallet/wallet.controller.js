"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletController = exports.WalletController = void 0;
const wallet_service_1 = require("./wallet.service");
const api_response_1 = require("../../common/types/api-response");
class WalletController {
    async getBalance(req, res, next) {
        try {
            const result = await wallet_service_1.walletService.getBalance(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Wallet balance retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getTransactions(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const type = req.query.type;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const result = await wallet_service_1.walletService.getTransactions(req.user.userId, {
                page,
                limit,
                type,
                startDate,
                endDate
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Wallet transactions retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getChatTransactions(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const result = await wallet_service_1.walletService.getChatTransactions(req.user.userId, { page, limit });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'User chat transaction history retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createTopupOrder(req, res, next) {
        try {
            const result = await wallet_service_1.walletService.createTopupOrder(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Top-up order created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async verifyTopupPayment(req, res, next) {
        try {
            const result = await wallet_service_1.walletService.verifyTopupPayment(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Top-up payment verified and credited to wallet', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WalletController = WalletController;
exports.walletController = new WalletController();
