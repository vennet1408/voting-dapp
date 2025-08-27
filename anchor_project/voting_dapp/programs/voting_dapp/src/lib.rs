use anchor_lang::prelude::*;

declare_id!("AnRj2tnQxDk67Ms45s19YTQRZCCPnWd3yvssfoxCm1fN");

#[program]
pub mod voting_dapp {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        question: String,
        options_count: u8,
    ) -> Result<()> {
        require!(options_count > 1, VotingError::TooFewOptions);
        require!(options_count as usize <= MAX_OPTIONS, VotingError::TooManyOptions);
        require!(question.as_bytes().len() <= MAX_QUESTION_BYTES, VotingError::QuestionTooLong);

        let poll = &mut ctx.accounts.poll;
        poll.authority = ctx.accounts.authority.key();
        poll.poll_id = poll_id;
        poll.bump = ctx.bumps.poll;
        poll.is_open = true;
        poll.options_count = options_count;
        poll.question = question;
        for i in 0..MAX_OPTIONS {
            poll.counts[i] = 0;
        }
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, option_index: u8) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        require!(poll.is_open, VotingError::PollClosed);
        require!((option_index as usize) < poll.options_count as usize, VotingError::InvalidOption);

        let voter = &mut ctx.accounts.voter_record;
        voter.poll = poll.key();
        voter.voter = ctx.accounts.voter.key();
        voter.bump = ctx.bumps.voter_record;
        voter.option_index = option_index;

        let idx = option_index as usize;
        let current = poll.counts[idx];
        poll.counts[idx] = current
            .checked_add(1)
            .ok_or(VotingError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        require!(poll.is_open, VotingError::PollClosed);
        poll.is_open = false;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(poll_id: u64, question: String, options_count: u8)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Poll::SPACE,
        seeds = [b"poll", authority.key().as_ref(), &poll_id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub poll: Account<'info, Poll>,
    /// CHECK: This is only used for the has_one check on `poll.authority`.
    /// The `has_one = authority` constraint ensures this pubkey matches the
    /// authority embedded in the `poll` account. No further data access.
    pub authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = voter,
        space = VoterRecord::SPACE,
        seeds = [b"vote", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub poll: Account<'info, Poll>,
}

#[account]
pub struct Poll {
    pub authority: Pubkey,
    pub poll_id: u64,
    pub bump: u8,
    pub is_open: bool,
    pub options_count: u8,
    pub counts: [u32; MAX_OPTIONS],
    pub question: String,
}

impl Poll {
    pub const SPACE: usize = 8
        + 32  // authority
        + 8   // poll_id
        + 1   // bump
        + 1   // is_open
        + 1   // options_count
        + (4 * MAX_OPTIONS) // counts
        + 4 + MAX_QUESTION_BYTES; // question string (anchor: 4 bytes prefix + data)
}

#[account]
pub struct VoterRecord {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub bump: u8,
    pub option_index: u8,
}

impl VoterRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1;
}

#[error_code]
pub enum VotingError {
    #[msg("Poll has already been closed")] 
    PollClosed,
    #[msg("Invalid option index")] 
    InvalidOption,
    #[msg("Too few options - need at least 2")] 
    TooFewOptions,
    #[msg("Too many options")] 
    TooManyOptions,
    #[msg("Question too long")] 
    QuestionTooLong,
    #[msg("Bump not found")] 
    BumpNotFound,
    #[msg("Arithmetic overflow")] 
    ArithmeticOverflow,
}

pub const MAX_OPTIONS: usize = 10;
pub const MAX_QUESTION_BYTES: usize = 128;
