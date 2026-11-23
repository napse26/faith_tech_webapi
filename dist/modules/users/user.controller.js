"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const user_service_1 = require("./user.service");
const api_response_1 = require("../../common/types/api-response");
class UserController {
    async initiateMobileChange(req, res, next) {
        try {
            const { newMobileNumber, countryCode } = req.body;
            const result = await user_service_1.userService.initiateMobileChange(req.user.id, newMobileNumber, countryCode);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Verification code sent to new mobile number', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async confirmMobileChange(req, res, next) {
        try {
            const { challengeId, otp } = req.body;
            const result = await user_service_1.userService.confirmMobileChange(req.user.id, challengeId, otp);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Mobile number updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deactivate(req, res, next) {
        try {
            await user_service_1.userService.deactivateAccount(req.user.id);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Account deactivated successfully. All sessions terminated.', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async submitDeletionRequest(req, res, next) {
        try {
            const { reason } = req.body;
            const result = await user_service_1.userService.requestAccountDeletion(req.user.id, reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account deletion requested. Your account is scheduled for deletion after 30 days.', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getCurrentDeletionRequest(req, res, next) {
        try {
            const result = await user_service_1.userService.getDeletionStatus(req.user.id);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Current deletion request retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
