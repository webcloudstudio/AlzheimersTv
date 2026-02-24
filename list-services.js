var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// Script to list all available streaming services from the API
import * as streamingAvailability from 'streaming-availability';
import { readFileSync } from 'fs';
var config = JSON.parse(readFileSync('./config.json', 'utf-8'));
var client = new streamingAvailability.Client(new streamingAvailability.Configuration({
    apiKey: config.apiKey,
}));
function listServices() {
    return __awaiter(this, void 0, void 0, function () {
        var usCountry, sortedServices, _i, sortedServices_1, service, hasSubscription, hasFree, types, recommendedNames, _a, sortedServices_2, service, serviceLower, idLower, _b, recommendedNames_1, keyword, hasSubscription, hasFree, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    console.log('Fetching list of available streaming services for country:', config.country);
                    console.log('='.repeat(80));
                    return [4 /*yield*/, client.countriesApi.getCountry({
                            countryCode: config.country,
                        })];
                case 1:
                    usCountry = _c.sent();
                    console.log('\nTotal services available:', usCountry.services.length);
                    console.log('\n' + '='.repeat(80));
                    console.log('Service ID'.padEnd(25), '|', 'Service Name'.padEnd(30), '|', 'Type');
                    console.log('='.repeat(80));
                    sortedServices = usCountry.services.sort(function (a, b) {
                        return a.name.localeCompare(b.name);
                    });
                    for (_i = 0, sortedServices_1 = sortedServices; _i < sortedServices_1.length; _i++) {
                        service = sortedServices_1[_i];
                        hasSubscription = service.streamingOptionTypes.subscription;
                        hasFree = service.streamingOptionTypes.free;
                        types = [];
                        if (hasSubscription)
                            types.push('subscription');
                        if (hasFree)
                            types.push('free');
                        if (service.streamingOptionTypes.rent)
                            types.push('rent');
                        if (service.streamingOptionTypes.buy)
                            types.push('buy');
                        if (service.streamingOptionTypes.addon)
                            types.push('addon');
                        console.log(service.id.padEnd(25), '|', service.name.padEnd(30), '|', types.join(', '));
                    }
                    console.log('\n' + '='.repeat(80));
                    console.log('\nRECOMMENDED SERVICES TO ADD:');
                    console.log('='.repeat(80));
                    recommendedNames = [
                        'paramount', 'peacock', 'showtime', 'amc', 'pbs',
                        'apple', 'starz', 'mubi', 'criterion', 'britbox',
                        'tubi', 'pluto', 'roku', 'crackle', 'vudu'
                    ];
                    for (_a = 0, sortedServices_2 = sortedServices; _a < sortedServices_2.length; _a++) {
                        service = sortedServices_2[_a];
                        serviceLower = service.name.toLowerCase();
                        idLower = service.id.toLowerCase();
                        for (_b = 0, recommendedNames_1 = recommendedNames; _b < recommendedNames_1.length; _b++) {
                            keyword = recommendedNames_1[_b];
                            if (serviceLower.includes(keyword) || idLower.includes(keyword)) {
                                hasSubscription = service.streamingOptionTypes.subscription;
                                hasFree = service.streamingOptionTypes.free;
                                console.log("\n".concat(service.name));
                                console.log("  ID: \"".concat(service.id, "\""));
                                console.log("  Types: subscription=".concat(hasSubscription, ", free=").concat(hasFree));
                                console.log("  Homepage: ".concat(service.homePage));
                                break;
                            }
                        }
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    console.error('Error fetching services:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
listServices();
