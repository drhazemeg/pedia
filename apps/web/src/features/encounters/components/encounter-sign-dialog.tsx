// apps/web/src/features/encounters/components/encounter-sign-dialog.tsx

import { Button } from "@pedia/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pedia/ui/components/dialog";
import { Input } from "@pedia/ui/components/input";
import { Label } from "@pedia/ui/components/label";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

export interface EncounterSignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with the typed signature name when the user confirms. The
   * caller is responsible for actually calling `encounter.sign` — this
   * dialog is purely a UI gate.
   */
  onConfirm: (signatureName: string) => Promise<void>;
  /** The patient's name, shown in the confirmation copy. */
  patientName: string;
}

/**
 * Confirmation dialog for signing an encounter.
 *
 * The e-signature input is a UX ritual, not a security control. The
 * router's `sign` procedure takes only the encounter ID — it does not
 * accept a signature string. If audit-trail-of-who-signed-what is
 * required, the router's `sign` input needs to grow a `signedByName`
 * field and the caller needs to forward this dialog's value.
 *
 * For now, this captures the intent and prevents accidental clicks.
 */
export function EncounterSignDialog({
  open,
  onOpenChange,
  onConfirm,
  patientName,
}: EncounterSignDialogProps) {
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!signature.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(signature.trim());
      setSignature("");
      onOpenChange(false);
      setSubmitting(false);
    } catch {
      // Error is handled by the caller's toast
      setSubmitting(false);
    }
  }, [onConfirm, onOpenChange, signature]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign encounter</DialogTitle>
          <DialogDescription>
            Signing locks this encounter against further edits. Type your full
            name to confirm you are the author of this record for{" "}
            <span className="font-medium">{patientName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="signature-name">Your full name</Label>
          <Input
            id="signature-name"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Dr. Jane Doe"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !signature.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing…
              </>
            ) : (
              "Sign encounter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
