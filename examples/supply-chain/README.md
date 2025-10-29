# Supply Chain Management Example Application

This example application implements a real-time supply chain management system, showcasing the tracking and management of unique products as they move through a multi-party supply chain. It demonstrates cross-chain custody transfers, enabling products to be registered, tracked, and transferred across different facilities, warehouses, and parties within the Linera blockchain ecosystem.

Once this application's module is published on a Linera chain, that application will contain the registry of products and their custody history.

## Real-World Use Case

This application enables:
- **Product Registration**: Manufacturers register products with unique serial numbers
- **Custody Tracking**: Track who currently holds each product (manufacturer, distributor, warehouse, retailer, etc.)
- **Multi-Location Visibility**: Each chain represents a facility/location, providing real-time visibility across the entire supply chain
- **Tamper-Proof History**: Immutable record of all custody transfers
- **Cross-Chain Transfers**: Seamlessly transfer products between different locations/facilities

## How It Works

Each chain maintains a subset of products, represented as unique token identifiers (serial numbers). Product custody is tracked across one or multiple chains (representing different facilities, warehouses, or organizations), allowing for rich, multi-party supply chain interactions.

The application supports three primary operations: `RegisterProduct`, `TransferCustody`, and `ClaimProduct`.

**`RegisterProduct`** creates a new product in the system, assigning it to the manufacturer. This is typically done when a product is manufactured or enters the supply chain.

**`TransferCustody`** changes the custody of a product from one party to another, either within the same facility (chain) or across facilities. This represents handoffs in the supply chain (e.g., manufacturer → distributor → retailer).

**`ClaimProduct`** sends a cross-chain message to transfer custody of a product from a remote facility to the current facility. This enables pull-based transfers where the receiving party initiates the custody change.

Products can be transferred to various destinations, including:
- Other parties within the same facility (same chain)
- The same party at a different facility (different chain)
- Other parties at different facilities (cross-chain, cross-account)

## Architecture

- **Chain = Facility/Location**: Each Linera chain represents a physical location (warehouse, distribution center, retail store)
- **Account = Party/Entity**: Each account represents a party in the supply chain (manufacturer, distributor, carrier, retailer)
- **Token ID = Product Serial Number**: Each product has a unique identifier for tracking
- **Blob Storage = Product Metadata**: Product details, specifications, certifications stored as data blobs

## Usage

### Setting Up

Before getting started, make sure that the binary tools `linera*` corresponding to
your version of `linera-sdk` are in your PATH. For scripting purposes, we also assume
that the BASH function `linera_spawn` is defined.

From the root of Linera repository, this can be achieved as follows:

```bash
export PATH="$PWD/target/debug:$PATH"
source /dev/stdin <<<"$(linera net helper 2>/dev/null)"
```

Next, start the local Linera network and run a faucet:

```bash
FAUCET_PORT=8079
FAUCET_URL=http://localhost:$FAUCET_PORT
linera_spawn linera net up --with-faucet --faucet-port $FAUCET_PORT

# If you're using a testnet, run this instead:
#   LINERA_TMP_DIR=$(mktemp -d)
#   FAUCET_URL=https://faucet.testnet-XXX.linera.net  # for some value XXX
```

Create the user wallet and add chains (representing different facilities):

```bash
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

linera wallet init --faucet $FAUCET_URL

INFO_1=($(linera wallet request-chain --faucet $FAUCET_URL))
INFO_2=($(linera wallet request-chain --faucet $FAUCET_URL))
CHAIN_1="${INFO_1[0]}"  # e.g., Manufacturing Facility
CHAIN_2="${INFO_2[0]}"  # e.g., Distribution Center
OWNER_1="${INFO_1[1]}"  # e.g., Manufacturer
OWNER_2="${INFO_2[1]}"  # e.g., Distributor
```

Build and publish the supply chain application:

```bash
(cd examples/supply-chain && cargo build --release --target wasm32-unknown-unknown)

MODULE_ID=$(linera publish-module \
    examples/target/wasm32-unknown-unknown/release/supply_chain_{contract,service}.wasm)
```

Here, we stored the new module ID in a variable `MODULE_ID` to be reused later.

### Creating the Supply Chain Application

Unlike fungible tokens, each product in the supply chain is unique and identified by a unique token ID (serial number). When creating the supply chain application, you don't need to specify an initial state or parameters. Products will be registered as they enter the supply chain.

Refer to the [fungible app README](https://github.com/linera-io/linera-protocol/blob/main/examples/fungible/README.md#creating-a-token) to figure out how to list the chains created for the test in the default wallet, as well as defining some variables corresponding to these values.

To create the supply chain application, run the command below:

```bash
APP_ID=$(linera create-application $MODULE_ID)
```

This will store the application ID in a new variable `APP_ID`.

### Using the Supply Chain Application

Operations such as registering products, transferring custody, and claiming products from other facilities follow a similar approach to fungible tokens, with adjustments for the unique nature of each product.

First, a node service for the current wallet has to be started:

```bash
PORT=8080
linera service --port $PORT &
```

#### Using GraphiQL

Type each of these in the GraphiQL interface and substitute the env variables with their actual values that we've defined above.

- Navigate to `http://localhost:8080/`.
- To publish a product metadata blob (specifications, certifications, etc.), run the mutation:

```gql,uri=http://localhost:8080/
mutation {
  publishDataBlob(
    chainId: "$CHAIN_1",
    bytes: [1, 2, 3, 4]
  )
}
```

Set the `QUERY_RESULT` variable to have the result returned by the previous query, and `BLOB_HASH` will be properly set for you.
Alternatively you can set the `BLOB_HASH` variable to the hash returned by the previous query yourself.

```bash
BLOB_HASH=$(echo "$QUERY_RESULT" | jq -r '.publishDataBlob')
```

- Run `echo "http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID"` to print the URL to navigate to.
- To register a product (e.g., when manufactured), run the mutation:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
mutation {
  registerProduct(
    manufacturer: "$OWNER_1",
    name: "iPhone 15 Pro - Serial#ABC123",
    blobHash: "$BLOB_HASH",
  )
}
```

- To check that it's assigned to the manufacturer, run the query:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
query {
  ownedProducts(owner: "$OWNER_1")
}
```

Set the `QUERY_RESULT` variable to have the result returned by the previous query, and `TOKEN_ID` will be properly set for you.
Alternatively you can set the `TOKEN_ID` variable to the `tokenId` value returned by the previous query yourself.

```bash
TOKEN_ID=$(echo "$QUERY_RESULT" | jq -r '.ownedProducts | to_entries | .[0].value.tokenId')
```

- To check the product details, run the query:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
query {
  product(tokenId: "$TOKEN_ID") {
    tokenId,
    owner,
    name,
    manufacturer,
    payload
  }
}
```

- To check all products in the system, run the query:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
query {
  products
}
```

- To transfer custody of the product to `$OWNER_2` (e.g., distributor), still at the same facility (`$CHAIN_1`), run the mutation:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
mutation {
  transferCustody(
    sourceOwner: "$OWNER_1",
    tokenId: "$TOKEN_ID",
    targetAccount: {
      chainId: "$CHAIN_1",
      owner: "$OWNER_2"
    }
  )
}
```

- To transfer custody to a different facility (cross-chain transfer), representing the product moving from manufacturing to distribution center:

```gql,uri=http://localhost:8080/chains/$CHAIN_1/applications/$APP_ID
mutation {
  transferCustody(
    sourceOwner: "$OWNER_1",
    tokenId: "$TOKEN_ID",
    targetAccount: {
      chainId: "$CHAIN_2",
      owner: "$OWNER_2"
    }
  )
}
```

#### Using Web Frontend

Installing and starting the web server:

```bash
cd examples/supply-chain/web-frontend
npm install --no-save

# Start the server but not open the web page right away.
BROWSER=none npm start &
```

Access the supply chain dashboard for different parties:

```bash
echo "http://localhost:3000/$CHAIN_1?app=$APP_ID&owner=$OWNER_1&port=$PORT"  # Manufacturer view
echo "http://localhost:3000/$CHAIN_2?app=$APP_ID&owner=$OWNER_2&port=$PORT"  # Distributor view
```

The web interface provides:
- Product registration form
- Custody transfer interface
- Real-time product tracking
- Multi-facility visibility
- Product history and audit trail

For additional frontend details, refer to [Fungible Token Example Application - Using web frontend](https://github.com/linera-io/linera-protocol/blob/main/examples/fungible/README.md#using-web-frontend).

## GraphQL API Reference

### Queries

- **`product(tokenId: String)`** - Get details of a specific product by its serial number
- **`products()`** - Get all products in the system
- **`ownedProducts(owner: AccountOwner)`** - Get all products currently held by a specific party
- **`ownedTokenIds()`** - Get all token IDs grouped by owner
- **`ownedTokenIdsByOwner(owner: AccountOwner)`** - Get token IDs for a specific owner

### Mutations

- **`registerProduct(manufacturer: AccountOwner, name: String, blobHash: DataBlobHash)`** - Register a new product
- **`transferCustody(sourceOwner: AccountOwner, tokenId: String, targetAccount: Account)`** - Transfer custody to another party
- **`claimProduct(sourceAccount: Account, tokenId: String, targetAccount: Account)`** - Claim a product from a remote facility

## Future Enhancements

Planned features for advanced supply chain management:
- Product status tracking (InTransit, Delivered, Verified, etc.)
- Checkpoint history for location updates
- Multi-party verification workflows
- Quality assurance checkpoints
- Temperature/condition monitoring integration
- Certification and compliance document tracking
- Real-time status notifications

## Example Supply Chain Flows

### Flow 1: Simple Manufacturer → Distributor
1. Manufacturer registers product at Factory (CHAIN_1)
2. Manufacturer transfers custody to Distributor at same facility
3. Distributor moves product to Distribution Center (CHAIN_2)

### Flow 2: Multi-Party Cross-Location
1. Manufacturer registers product at Factory (CHAIN_1, OWNER_1)
2. Transfer custody to Carrier (CHAIN_1, OWNER_2)
3. Carrier moves to Distribution Center (CHAIN_2, OWNER_2)
4. Transfer custody to Retailer (CHAIN_2, OWNER_3)
5. Complete audit trail preserved on blockchain

## License

Apache-2.0
