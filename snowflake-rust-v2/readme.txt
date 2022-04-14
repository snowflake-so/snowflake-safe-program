anchorsolana config set --url https://api.devnet.solana.com
solana config set --url https://api.testnet.solana.com
solana config set --url http://localhost:8899

//local upgrade
//anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63
anchor deploy -p snowflake

//devnet upgrade
//anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63 --provider.cluster devnet
anchor upgrade target/deploy/snowflake.so --program-id BiVwqu45yQTxqTTTAD1UrMZNyZ3qsEVqKwTEfG9BvUs6 --provider.cluster devnet

//fresh deploy to local
anchor deploy

//fresh deploy to devnet
anchor deploy --provider.cluster devnet



// soteria
docker run -v ~/workspace/snow/snowflake-rust/:/workspace -it greencorelab/soteria:0.1.0 /bin/bash