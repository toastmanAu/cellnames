export const config = {
  port:               parseInt(process.env.PORT        ?? '8053'),
  ckbRpcUrl:          process.env.CKB_RPC_URL          ?? 'http://localhost:8114',
  cellnamesTypeHash:  process.env.CELLNAMES_TYPE_HASH  ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
  ttl:                parseInt(process.env.DNS_TTL      ?? '300'),
};
