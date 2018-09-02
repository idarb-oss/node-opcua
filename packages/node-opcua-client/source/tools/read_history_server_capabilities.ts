/**
 * @module bode-opcua-client
 */
import { assert } from "node-opcua-assert";
import { ObjectIds } from "node-opcua-constants";
import { AttributeIds } from "node-opcua-data-model";
import { DataValue } from "node-opcua-data-value";
import { NodeId } from "node-opcua-nodeid";
import { BrowsePath, BrowsePathResult, makeBrowsePath } from "node-opcua-service-translate-browse-path";
import { StatusCodes } from "node-opcua-status-code";
import { lowerFirstLetter } from "node-opcua-utils";
import { Variant } from "node-opcua-variant";
import { ClientSession, ReadValueIdLike } from "../client_session";

export interface HistoryServerCapabilities {
    [key: string ]: any;
}

export function readHistoryServerCapabilities(
    session: ClientSession,
    callback: (err: Error| null, capabilities?: HistoryServerCapabilities) => void) {

    // display HistoryCapabilities of server
    const browsePath: BrowsePath = makeBrowsePath(ObjectIds.ObjectsFolder, "/Server/ServerCapabilities.HistoryServerCapabilities");
    session.translateBrowsePath(browsePath, (err: Error | null, result?: BrowsePathResult) => {
        if (err) {
            return callback(err);
        }
        if (!result) {
            return callback(new Error("Internal Error"));
        }
        if (result.statusCode !== StatusCodes.Good) {
            return callback(new Error("StatusCode = " + result.statusCode.toString()));
        }

        result.targets = result.targets || [];

        const historyServerCapabilitiesNodeId = result.targets[0].targetId;


        // (should be ns=0;i=11192)
        assert(historyServerCapabilitiesNodeId.toString() === "ns=0;i=11192");

        // -------------------------
        const properties = [
            "AccessHistoryDataCapability",
            "AccessHistoryEventsCapability",
            "DeleteAtTimeCapability",
            "DeleteRawCapability",
            "DeleteEventCapability",
            "InsertAnnotationCapability",
            "InsertDataCapability",
            "InsertEventCapability",
            "ReplaceDataCapability",
            "ReplaceEventCapability",
            "UpdateDataCapability",
            "UpdateEventCapability",
            "MaxReturnDataValues",
            "MaxReturnEventValues",
            "AggregateFunctions/AnnotationCount",
            "AggregateFunctions/Average",
            "AggregateFunctions/Count",
            "AggregateFunctions/Delta",
            "AggregateFunctions/DeltaBounds",
            "AggregateFunctions/DurationBad",
            "AggregateFunctions/DurationGood",
            "AggregateFunctions/DurationStateNonZero",
            // etc....
        ];
        const browsePaths = properties.map(
            (prop: string) => makeBrowsePath(historyServerCapabilitiesNodeId, "." + prop));

        session.translateBrowsePath(browsePaths, (err: Error | null, results?: BrowsePathResult[]) => {
            if (err) {
                return callback(err);
            }
            if (!results) {
                return callback(new Error("Internal Error"));
            }

            const nodeIds = results.map(
                (result: BrowsePathResult) => (result.statusCode === StatusCodes.Good && result.targets) ?
                                result.targets[0].targetId : NodeId.nullNodeId);

            const nodesToRead: ReadValueIdLike [] = nodeIds.map((nodeId: NodeId) => {
                return {
                    attributeId: AttributeIds.Value,
                    nodeId/*: coerceNodeId(nodeId)*/,
                };
            });

            const data: HistoryServerCapabilities = {};

            session.read(nodesToRead, (err: Error | null, dataValues?: DataValue[]) => {

                if (err) {
                    return callback(err);
                }
                if (!dataValues) {
                    return callback(new Error("Internal Error"));
                }

                for (let i = 0; i < dataValues.length; i++) {
                    const propName = lowerFirstLetter(properties[i]);
                    const value: Variant = dataValues[i].value as Variant;
                    data[propName] =  value;
                }
                callback(null, data);
            });
        });
    });
}