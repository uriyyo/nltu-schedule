import {Box, Button, Snackbar} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import React, {useState} from 'react'

export default function CopyToClipboardButton({link}: { link: string }) {
    const [open, setOpen] = useState(false)

    const handleClick = () => {
        setOpen(true);
        navigator.clipboard.writeText(link);
    }

    return (
        <>
                    <Button
          onClick={handleClick}
          color="inherit"
          size="small"
          aria-label="Copy day link"
        >
          <ContentCopyIcon fontSize="medium" />
        </Button>

            <Snackbar
                open={open}
                onClose={() => setOpen(false)}
                autoHideDuration={2000}
                message="Посилання скопійовано"
            />
        </>
    )
}
