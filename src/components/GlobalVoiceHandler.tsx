'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceController, VoiceCommand } from '../lib/voice';
import { track } from '../lib/telemetry';

interface GlobalVoiceHandlerProps {
  onAssistantCommand?: (message: string) => void;
  onTopupCommand?: (amount?: number) => void;
  onTransferCommand?: (amount?: number, target?: string) => void;
}

export function GlobalVoiceHandler({ 
  onAssistantCommand, 
  onTopupCommand, 
  onTransferCommand 
}: GlobalVoiceHandlerProps) {
  const router = useRouter();
  const voiceController = useRef<VoiceController | null>(null);
  const isListening = useRef(false);

  useEffect(() => {
    // Initialize voice controller
    voiceController.current = new VoiceController();

    // Check if voice is enabled
    const checkVoiceEnabled = () => {
      const voiceEnabled = localStorage.getItem('voice_enabled') === 'true';
      if (voiceEnabled && voiceController.current?.isSupported()) {
        startGlobalListening();
      }
    };

    // Start listening for global voice commands
    const startGlobalListening = () => {
      if (isListening.current || !voiceController.current) return;

      isListening.current = true;
      
      voiceController.current.startListening(
        (command: VoiceCommand) => {
          handleVoiceCommand(command);
          isListening.current = false;
          // Restart listening after a delay
          setTimeout(() => {
            if (localStorage.getItem('voice_enabled') === 'true') {
              startGlobalListening();
            }
          }, 2000);
        },
        (error: string) => {
          console.error('Voice recognition error:', error);
          isListening.current = false;
          // Restart listening after error
          setTimeout(() => {
            if (localStorage.getItem('voice_enabled') === 'true') {
              startGlobalListening();
            }
          }, 5000);
        }
      );
    };

    const handleVoiceCommand = (command: VoiceCommand) => {
      track('voice_command', { action: command.action, amount: command.amount });

      switch (command.action) {
        case 'assistant':
          if (onAssistantCommand && command.message) {
            onAssistantCommand(command.message);
          }
          break;
          
        case 'topup':
          if (onTopupCommand) {
            onTopupCommand(command.amount);
          } else {
            // Fallback to navigation
            router.push('/pay');
          }
          break;
          
        case 'transfer':
          if (onTransferCommand) {
            onTransferCommand(command.amount, command.target);
          } else {
            // Fallback to navigation
            router.push('/pay');
          }
          break;
          
        case 'invest':
          // Navigate to home for investment
          router.push('/home');
          break;
          
        default:
          console.log('Unknown voice command:', command);
      }
    };

    // Start listening
    checkVoiceEnabled();

    // Listen for voice setting changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'voice_enabled') {
        if (e.newValue === 'true') {
          startGlobalListening();
        } else {
          if (voiceController.current) {
            voiceController.current.stopListening();
          }
          isListening.current = false;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (voiceController.current) {
        voiceController.current.stopListening();
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router, onAssistantCommand, onTopupCommand, onTransferCommand]);

  return null; // This component doesn't render anything
}
