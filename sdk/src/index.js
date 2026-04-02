/**
 * CellNames SDK — entry point
 *
 * Decentralised DNS on Nervos CKB.
 */

export {
  RecordType,
  Flags,
  recordTypeName,
  encodeRecords,
  decodeRecords,
  aRecord,
  aaaaRecord,
  txtRecord,
  cnameRecord,
  redirectRecord,
  tlsaRecord,
  ipfsRecord,
  profileRecord,
  socialRecord,
  addressRecord,
} from "./records.js";

export {
  normaliseDomain,
  hashDomain,
  domainHashHex,
  displayDomain,
} from "./domain.js";
