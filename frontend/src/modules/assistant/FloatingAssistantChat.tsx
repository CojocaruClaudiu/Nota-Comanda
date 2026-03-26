import { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { askPublicAssistant, type PublicAssistantContext } from '../../api/assistant';

type FloatingAssistantChatProps = {
  open: boolean;
  onClose: () => void;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

const DEFAULT_PROMPT = 'Cand expira ITP-ul pentru PH-16-TOP?';
const DEFAULT_MESSAGE =
  'Poti intreba despre expirari ITP/RCA/CASCO/rovinieta. Exemplu: "Cand expira ITP-ul pentru PH-16-TOP?"';

export default function FloatingAssistantChat({ open, onClose }: FloatingAssistantChatProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantInput, setAssistantInput] = useState(DEFAULT_PROMPT);
  const [assistantContext, setAssistantContext] = useState<PublicAssistantContext>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: DEFAULT_MESSAGE,
    },
  ]);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, open]);

  const askAssistant = async () => {
    const question = assistantInput.trim();
    if (!question || assistantLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const response = await askPublicAssistant(question, assistantContext);
      setAssistantContext((prev) => ({
        intent: response.intent ?? prev.intent ?? null,
        matchedPlate: response.matchedPlate ?? prev.matchedPlate ?? null,
      }));
      setMessages((prev) => [...prev, { role: 'assistant', text: response.answer }]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: error?.message || 'Nu am putut procesa intrebarea momentan.',
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      hideBackdrop
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: isMobile ? '100vw' : 390,
          maxWidth: '100vw',
          top: { xs: '52px', sm: '56px' },
          height: { xs: 'calc(100dvh - 52px)', sm: 'calc(100dvh - 56px)' },
          borderTopLeftRadius: { xs: 0, sm: 12 },
          borderBottomLeftRadius: { xs: 0, sm: 12 },
          borderLeft: (t) => `1px solid ${t.palette.divider}`,
          boxShadow: (t) => t.shadows[8],
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={(t) => ({
            px: 1.5,
            py: 1.2,
            borderBottom: `1px solid ${t.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: t.palette.background.default,
          })}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={800}>
              Asistent AI
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Inchide asistentul">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          ref={messagesRef}
          sx={(t) => ({
            flex: 1,
            overflowY: 'auto',
            p: 1.25,
            bgcolor: t.palette.grey[50],
          })}
        >
          <Stack spacing={1}>
            {messages.map((message, idx) => (
              <Box
                key={`${message.role}-${idx}`}
                sx={(t) => ({
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  px: 1.25,
                  py: 0.9,
                  borderRadius: 1.5,
                  bgcolor: message.role === 'user' ? t.palette.primary.main : t.palette.background.paper,
                  color: message.role === 'user' ? t.palette.primary.contrastText : t.palette.text.primary,
                  border: message.role === 'user' ? 'none' : `1px solid ${t.palette.divider}`,
                })}
              >
                <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>
                  {message.role === 'user' ? 'Tu' : 'Asistent'}
                </Typography>
                <Typography variant="body2">{message.text}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={(t) => ({
            p: 1.25,
            borderTop: `1px solid ${t.palette.divider}`,
            alignItems: 'flex-end',
          })}
        >
          <TextField
            fullWidth
            size="small"
            label="Intreaba asistentul"
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            multiline
            minRows={2}
            maxRows={4}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void askAssistant();
              }
            }}
            placeholder="Ex: Cand expira ITP-ul pentru PH-16-TOP?"
          />
          <Tooltip title="Trimite">
            <span>
              <IconButton
                color="primary"
                onClick={() => void askAssistant()}
                disabled={assistantLoading || !assistantInput.trim()}
                sx={{ mb: 0.25 }}
              >
                {assistantLoading ? <CircularProgress size={20} /> : <SendRoundedIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}
