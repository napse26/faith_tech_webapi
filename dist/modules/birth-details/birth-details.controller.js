"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.birthDetailsController = exports.BirthDetailsController = void 0;
const birth_details_service_1 = require("./birth-details.service");
const api_response_1 = require("../../common/types/api-response");
class BirthDetailsController {
    async getBirthDetails(req, res, next) {
        try {
            const details = await birth_details_service_1.birthDetailsService.getBirthDetails(req.user.id);
            res.status(200).json((0, api_response_1.createSuccessResponse)(details, 'Astrology birth details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async upsertBirthDetails(req, res, next) {
        try {
            const details = await birth_details_service_1.birthDetailsService.upsertBirthDetails(req.user.id, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(details, 'Astrology birth details saved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BirthDetailsController = BirthDetailsController;
exports.birthDetailsController = new BirthDetailsController();
