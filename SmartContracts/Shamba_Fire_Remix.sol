//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ShambaFireRemix is ChainlinkClient {
    using Chainlink for Chainlink.Request;

    uint256[][] public fire_data;

    struct Geometry {
        uint256 property_id;
        string coordinates;
    }

    mapping(uint256 => Geometry) geometry;

    function addGeometry(
        uint256 property_id,
        string memory coordinates
    ) public {
        Geometry memory g = Geometry({
            property_id: property_id,
            coordinates: coordinates
        });

        geometry[property_id] = g;
    }

    function getGeometry(uint256 property_id)
        public
        view
        returns (Geometry memory)
    {
        return geometry[property_id];
    }

    constructor() {
        setChainlinkToken(0xa36085F69e2889c224210F603D836748e7dC0088);
        setChainlinkOracle(0xf4434feDd55D3d6573627F39fA39867b23f4Bf7F);
    }

    function concat(string memory a, string memory b)
        private
        pure
        returns (string memory)
    {
        return (string(abi.encodePacked(a, "", b)));
    }

    function requestFireData(
        string memory dataset_code,
        string memory selected_band,
        string memory image_scale,
        string memory start_date,
        string memory end_date,
        uint256 geometry_length
    ) public {
        bytes32 specId = "6622988079e143c69d9e0eb4b668729d";

        uint256 payment = 1000000000000000000;
        Chainlink.Request memory req = buildChainlinkRequest(
            specId,
            address(this),
            this.fulfillFireData.selector
        );

        string memory concatenated_data = concat(
            '{"dataset_code":"',
            dataset_code
        );
        concatenated_data = concat(concatenated_data, '", "selected_band":"');
        concatenated_data = concat(concatenated_data, selected_band);
        concatenated_data = concat(concatenated_data, '", "image_scale":');
        concatenated_data = concat(concatenated_data, image_scale);
        concatenated_data = concat(concatenated_data, ', "start_date":"');
        concatenated_data = concat(concatenated_data, start_date);
        concatenated_data = concat(concatenated_data, '", "end_date":"');
        concatenated_data = concat(concatenated_data, end_date);
        concatenated_data = concat(
            concatenated_data,
            '", "geometry":{"type":"FeatureCollection","features":['
        );

        for (uint256 i = 0; i < geometry_length; i++) {
            concatenated_data = concat(
                concatenated_data,
                '{"type":"Feature","properties":{"id":'
            );
            concatenated_data = concat(
                concatenated_data,
                Strings.toString(geometry[i + 1].property_id)
            );
            concatenated_data = concat(
                concatenated_data,
                '},"geometry":{"type":"Polygon","coordinates":'
            );
            concatenated_data = concat(
                concatenated_data,
                geometry[i + 1].coordinates
            );
            concatenated_data = concat(concatenated_data, "}}");

            if (i != geometry_length - 1) {
                concatenated_data = concat(concatenated_data, ",");
            }
        }
        concatenated_data = concat(concatenated_data, "]}}");
        string memory req_data = concatenated_data;

        req.add("data", req_data);

        sendOperatorRequest(req, payment);
    }

    function fulfillFireData(bytes32 requestId, uint256[][] memory fireData)
        public
        recordChainlinkFulfillment(requestId)
    {
        fire_data = fireData;
    }
}
