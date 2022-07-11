use anchor_lang::prelude::*;

use crate::error::ErrorCode;

#[account]
#[derive(Default, Debug)]
pub struct Safe {
    pub approvals_required: u8,
    pub creator: Pubkey,
    pub created_at: i64,
    pub signer_bump: u8,
    pub owner_set_seqno: u8,
    pub extra: String,
    pub owners: Vec<Pubkey>,
}

impl Safe {
    pub const MAX_OWNERS: u8 = 64;

    pub fn space(max_owners: u8, extra_content: String) -> usize {
        8    // Anchor account discriminator
        + 1  // approvals_required
        + 32 // creator
        + 8  // created_at
        + 1  // signer_bump
        + 1  // owner_set_seqno
        + 4 + extra_content.len() // extra
        + 4 + std::mem::size_of::<Pubkey>() * (max_owners as usize) // owners
    }

    pub fn is_owner(&self, caller: &Pubkey) -> bool {
        self.owners.contains(caller)
    }
}

pub fn assert_unique_owners(owners: &[Pubkey]) -> Result<()> {
    for (i, owner) in owners.iter().enumerate() {
        require!(
            !owners.iter().skip(i + 1).any(|item| item == owner),
            ErrorCode::DuplicateOwnerInSafe
        )
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_owner() {
        let mut safe = sample_safe();
        let owner_a = Pubkey::new_unique();

        assert_eq!(safe.is_owner(&owner_a), false);

        let owner_b = Pubkey::new_unique();
        let owner_c = Pubkey::new_unique();
        safe.owners = vec![owner_a, owner_b];

        assert_eq!(safe.is_owner(&owner_a), true);
        assert_eq!(safe.is_owner(&owner_b), true);
        assert_eq!(safe.is_owner(&owner_c), false);
    }

    #[test]
    fn test_assert_unique_owners() {
        let owner_a = Pubkey::new_unique();
        let owner_b = Pubkey::new_unique();
        let owner_c = Pubkey::new_unique();

        let result = assert_unique_owners(&[owner_a, owner_b, owner_c]);
        assert_eq!(result.is_ok(), true);

        let result = assert_unique_owners(&[owner_a, owner_a]);
        // Detail error checking will wait until the next release
        // https://github.com/project-serum/anchor/issues/1538
        assert_eq!(result.is_err(), true);

        let result = assert_unique_owners(&[owner_a, owner_b, owner_b, owner_c]);
        assert_eq!(result.is_err(), true);
    }

    fn sample_safe() -> Safe {
        Safe {
            approvals_required: 1,
            creator: Pubkey::new_unique(),
            created_at: 1652946372,
            signer_bump: 254,
            owner_set_seqno: 0,
            extra: "".to_string(),
            owners: vec![],
        }
    }
}
