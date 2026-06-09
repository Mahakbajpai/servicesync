// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BookingAudit {
    struct AuditRecord {
        string oldStatus;
        string newStatus;
        uint256 timestamp;
        address actor;
    }

    // Map Booking ID (as string from MongoDB) to list of status change records
    mapping(string => AuditRecord[]) private auditLogs;

    // Event fired when status changes
    event StatusChanged(
        string indexed bookingId,
        string oldStatus,
        string newStatus,
        uint256 timestamp,
        address indexed actor
    );

    // Record a new status change event in the audit log
    function recordStatusChange(
        string calldata bookingId,
        string calldata oldStatus,
        string calldata newStatus,
        address actor
    ) external {
        AuditRecord memory record = AuditRecord({
            oldStatus: oldStatus,
            newStatus: newStatus,
            timestamp: block.timestamp,
            actor: actor
        });

        auditLogs[bookingId].push(record);

        emit StatusChanged(
            bookingId,
            oldStatus,
            newStatus,
            block.timestamp,
            actor
        );
    }

    // Retrieve the full list of audit logs for a booking
    function getAuditLogs(
        string calldata bookingId
    ) external view returns (AuditRecord[] memory) {
        return auditLogs[bookingId];
    }
}
