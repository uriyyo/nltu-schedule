import { Box, Fab, useScrollTrigger, Zoom } from "@mui/material";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import React, { useCallback } from "react";

export default function ScrollToTop() {
  const trigger = useScrollTrigger({
    threshold: 100,
  });
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <Zoom in={trigger}>
      <Box
        role="presentation"
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1,
        }}
      >
        <Fab
          onClick={scrollToTop}
          color="inherit"
          size="small"
          aria-label="Scroll back to top"
        >
          <ArrowCircleUpIcon fontSize="medium" />
        </Fab>
      </Box>
    </Zoom>
  );
}
