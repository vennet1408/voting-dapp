# Project Description

**Deployed Frontend URL:** [TODO: Add once deployed]

**Solana Program ID:** `AnRj2tnQxDk67Ms45s19YTQRZCCPnWd3yvssfoxCm1fN`

## Project Overview

### Description

On-chain polling/voting dApp. An authority creates a poll with a question and up to 10 options. Wallets cast exactly one vote per poll. The poll authority can close the poll to stop further voting. Vote counts are stored on-chain.

### Key Features

- **Create poll**: Authority seeds a PDA poll with question and options count.
- **Cast vote**: Any wallet can vote once per poll; counts updated atomically.
- **Close poll**: Authority closes poll to freeze voting; results remain on-chain.
  
### How to Use the dApp

1. **Connect Wallet** on Devnet.
2. **Create Poll**: Enter question and options count (2–10). Submit.
3. **Vote**: Select an option and cast your vote (one per wallet per poll).
4. **Close Poll** (authority only): Finalizes the poll and halts new votes.

## Program Architecture

Anchor-based program with two PDA-backed accounts: `Poll` and `VoterRecord`. Instructions: `create_poll`, `vote`, `close_poll`. Counts use checked math; account sizes are fixed; inputs validated.

### PDA Usage

**Seeds and purposes:**

- `poll` PDA: seeds = ["poll", authority, poll_id_le]. Uniquely identifies a poll created by `authority`.
- `vote` PDA: seeds = ["vote", poll_pubkey, voter]. Ensures one vote per wallet per poll via address uniqueness.

### Program Instructions

**Instructions Implemented:**

- `create_poll(poll_id: u64, question: String, options_count: u8)`: Initializes a `Poll` PDA, validates sizes and limits.
- `vote(option_index: u8)`: Creates a `VoterRecord` PDA and increments the selected option count; validates range and openness.
- `close_poll()`: Authority-only; marks `is_open = false`.

### Account Structure

```rust
#[account]
pub struct Poll {
    pub authority: Pubkey,
    pub poll_id: u64,
    pub bump: u8,
    pub is_open: bool,
    pub options_count: u8,
    pub counts: [u32; 10],
    pub question: String,
}

#[account]
pub struct VoterRecord {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub bump: u8,
    pub option_index: u8,
}
```

## Testing

### Test Coverage

Unit tests via Anchor’s Mocha runner cover core flows and validation.

**Happy Path Tests:**

- Create a poll, cast a vote, and close the poll; asserts on-chain state transitions.

**Unhappy Path Tests:**

- Invalid option index (out of range) rejected.
- Voting after poll is closed rejected.
- Question exceeding 128 bytes rejected.

### Running Tests

```bash
# Commands to run your tests
anchor test
```

### Additional Notes for Evaluators

- Cluster: Devnet. Program ID recorded above.
- PDAs enforce one-vote-per-poll per wallet via addressing, not runtime lists.
