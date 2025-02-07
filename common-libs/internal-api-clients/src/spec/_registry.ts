/* eslint-disable */
export default {
  "components": {
    "examples": {},
    "headers": {},
    "parameters": {},
    "requestBodies": {},
    "responses": {},
    "schemas": {
      "PutDocumentInIpfsOutput": {
        "properties": {
          "hash": {
            "type": "string"
          }
        },
        "required": [
          "hash"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "PutDocumentInIpfsInput": {
        "properties": {
          "document": {
            "additionalProperties": true,
            "type": "object"
          }
        },
        "required": [
          "document"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "CreateAnchorTransactionOutput": {
        "properties": {
          "digestHex": {
            "type": "string"
          }
        },
        "required": [
          "digestHex"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "CreateAnchorTransactionInput": {
        "properties": {
          "did": {
            "type": "string",
            "pattern": "^did:(elem|jolo):.*$"
          },
          "nonce": {
            "type": "number",
            "format": "double"
          },
          "didDocumentAddress": {
            "type": "string"
          }
        },
        "required": [
          "did",
          "nonce",
          "didDocumentAddress"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "TransactionCountOutput": {
        "properties": {
          "transactionCount": {
            "type": "number",
            "format": "double"
          }
        },
        "required": [
          "transactionCount"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "TransactionCountInput": {
        "properties": {
          "ethereumPublicKeyHex": {
            "type": "string"
          }
        },
        "required": [
          "ethereumPublicKeyHex"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "AnchorDidOutput": {
        "properties": {
          "did": {
            "type": "string",
            "pattern": "^did:(elem|jolo):.*$"
          }
        },
        "required": [
          "did"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "AnchorDidInput": {
        "properties": {
          "did": {
            "type": "string",
            "pattern": "^did:(elem|jolo):.*$"
          },
          "didDocumentAddress": {
            "type": "string"
          },
          "nonce": {
            "type": "number",
            "format": "double",
            "nullable": true
          },
          "ethereumPublicKeyHex": {
            "type": "string"
          },
          "transactionSignatureJson": {
            "additionalProperties": true,
            "type": "object"
          }
        },
        "required": [
          "did",
          "didDocumentAddress",
          "ethereumPublicKeyHex",
          "transactionSignatureJson"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ResolveDidOutput": {
        "properties": {
          "didDocument": {
            "additionalProperties": true,
            "type": "object"
          }
        },
        "required": [
          "didDocument"
        ],
        "type": "object",
        "additionalProperties": false
      },
      "ResolveDidInput": {
        "properties": {
          "did": {
            "type": "string",
            "pattern": "^did:(elem|jolo):.*$"
          }
        },
        "required": [
          "did"
        ],
        "type": "object",
        "additionalProperties": false
      }
    },
    "securitySchemes": {}
  },
  "info": {
    "title": "affinity-registry",
    "version": "0.2.6",
    "description": "Affinity Registry",
    "license": {
      "name": "ISC"
    }
  },
  "openapi": "3.0.0",
  "paths": {
    "/did/put-in-ipfs": {
      "post": {
        "operationId": "PutDocumentInIpfs",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PutDocumentInIpfsOutput"
                }
              }
            },
            "description": "Ok"
          }
        },
        "description": "Put signed by client DID document in IPFS and return hash that links to the document",
        "summary": "Saves DID document in IPFS",
        "tags": [
          "DID"
        ],
        "security": [],
        "parameters": [],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PutDocumentInIpfsInput"
              }
            }
          }
        }
      }
    },
    "/did/anchor-transaction": {
      "post": {
        "operationId": "CreateAnchorTransaction",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateAnchorTransactionOutput"
                }
              }
            },
            "description": "Ok"
          }
        },
        "description": "Create Anchor transaction for blockchain and return digest hex of it",
        "summary": "Create Anchor transaction",
        "tags": [
          "DID"
        ],
        "security": [],
        "parameters": [],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateAnchorTransactionInput"
              }
            }
          }
        }
      }
    },
    "/did/transaction-count": {
      "post": {
        "operationId": "TransactionCount",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TransactionCountOutput"
                }
              }
            },
            "description": "Ok"
          }
        },
        "description": "Get transaction count from blockchain for current wallet",
        "summary": "Create Anchor transaction",
        "tags": [
          "DID"
        ],
        "security": [],
        "parameters": [],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/TransactionCountInput"
              }
            }
          }
        }
      }
    },
    "/did/anchor-did": {
      "post": {
        "operationId": "AnchorDid",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AnchorDidOutput"
                }
              }
            },
            "description": "Ok"
          }
        },
        "description": "Anchor DID document in blockchain and return transaction hash",
        "summary": "Anchors DID document",
        "tags": [
          "DID"
        ],
        "security": [],
        "parameters": [
          {
            "in": "header",
            "name": "Api-Key",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AnchorDidInput"
              }
            }
          }
        }
      }
    },
    "/did/resolve-did": {
      "post": {
        "operationId": "ResolveDid",
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResolveDidOutput"
                }
              }
            },
            "description": "Ok"
          }
        },
        "description": "Resolve DID document from IPFS",
        "summary": "Resolves DID document",
        "tags": [
          "DID"
        ],
        "security": [],
        "parameters": [],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResolveDidInput"
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "/api/v1"
    }
  ]
} as const
