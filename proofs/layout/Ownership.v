From Coq Require Import List Bool Arith Lia.
Import ListNotations.

(* CARVE-P0-003, after prefix decoding and opaque-body handling.
   Inputs are classified boundaries, not source text. *)
Inductive boundary :=
| ordinary | blank | line_comment | fenced_comment | definition | heading
| quote | code_fence | raw_fence | colon_fence | table
| nested_list | continuation | end_input.

Inductive container := Quote | ListItem | DefinitionBody | FootnoteBody.

Record frame := Frame {
  kind : container;
  base_column : nat;
  content_column : nat;
  container_open : bool;
  paragraph_open : bool
}.

Definition boundary_state (b : boundary) (deepest : bool) : bool * bool :=
  match b with
  | ordinary => (true, true)
  | quote | nested_list | continuation => (true, deepest)
  | end_input => (false, false)
  | _ => (true, false)
  end.

Definition step (f : frame) (event : boundary * bool) : frame :=
  let '(c, p) := boundary_state (fst event) (snd event) in
  Frame (kind f) (base_column f) (content_column f)
    (container_open f && c) (container_open f && p).

Definition set_paragraph (p : bool) (f : frame) : frame :=
  Frame (kind f) (base_column f) (content_column f) (container_open f) p.

(* The column-only branch of the owner table. The caller has already ruled
   out a stored continuation claim. The stack is innermost first; None names
   the document. Frame identifiers distinguish nested containers of one kind.
   Well-formed frames have base_column < content_column. *)
Definition owns_column (column : nat) (f : frame) : bool :=
  container_open f && Nat.ltb (base_column f) column.

Fixpoint column_owner (column : nat) (stack : list (nat * frame)) : option nat :=
  match stack with
  | [] => None
  | (id, f) :: rest =>
      if owns_column column f then Some id else column_owner column rest
  end.

Fixpoint run (f : frame) (events : list (boundary * bool)) : frame :=
  match events with
  | [] => f
  | event :: rest => run (step f event) rest
  end.

Theorem boundary_keeps_container : forall f b deepest,
  container_open f = true -> b <> end_input ->
  container_open (step f (b, deepest)) = true.
Proof.
  intros f b deepest Hopen Hboundary.
  destruct b; simpl; rewrite Hopen; simpl; congruence.
Qed.

Theorem comment_closes_only_paragraph : forall f deepest,
  container_open f = true ->
  container_open (step f (line_comment, deepest)) = true /\
  paragraph_open (step f (line_comment, deepest)) = false /\
  container_open (step f (fenced_comment, deepest)) = true /\
  paragraph_open (step f (fenced_comment, deepest)) = false.
Proof.
  intros f deepest Hopen; simpl; rewrite Hopen; repeat split; reflexivity.
Qed.

Theorem closed_frame_stays_closed : forall f event,
  container_open f = false ->
  container_open (step f event) = false /\
  paragraph_open (step f event) = false.
Proof.
  intros f [b deepest] Hclosed.
  destruct b; simpl; rewrite Hclosed; split; reflexivity.
Qed.

(* Uniformity of this boundary operation, not of full container parsing. *)
Theorem boundary_uniformity : forall k1 k2 base content c p event,
  let f1 := step (Frame k1 base content c p) event in
  let f2 := step (Frame k2 base content c p) event in
  container_open f1 = container_open f2 /\
  paragraph_open f1 = paragraph_open f2.
Proof.
  intros k1 k2 base content c p [b deepest].
  destruct b; split; reflexivity.
Qed.

Theorem owner_ignores_paragraph : forall column stack p,
  column_owner column
    (map (fun entry => (fst entry, set_paragraph p (snd entry))) stack) =
  column_owner column stack.
Proof.
  intros column stack; induction stack as [| [id f] rest IH]; intros p.
  - reflexivity.
  - change
      ((if owns_column column f then Some id else
          column_owner column
            (map (fun entry => (fst entry, set_paragraph p (snd entry))) rest)) =
       (if owns_column column f then Some id else column_owner column rest)).
    rewrite IH. reflexivity.
Qed.

Theorem at_or_below_base_selects_ancestor : forall id f rest column,
  column <= base_column f ->
  column_owner column ((id, f) :: rest) = column_owner column rest.
Proof.
  intros id f rest column H.
  assert (Nat.ltb (base_column f) column = false) as E
    by (apply Nat.ltb_ge; exact H).
  simpl. unfold owns_column. rewrite E, andb_false_r. reflexivity.
Qed.

Theorem past_base_selects_innermost : forall id f rest column,
  container_open f = true -> base_column f < column ->
  column_owner column ((id, f) :: rest) = Some id.
Proof.
  intros id f rest column Hopen Hcolumn.
  assert (Nat.ltb (base_column f) column = true) as E
    by (apply Nat.ltb_lt; exact Hcolumn).
  simpl. unfold owns_column. rewrite Hopen, E. reflexivity.
Qed.

Theorem content_column_selects_innermost : forall id f rest column,
  container_open f = true ->
  base_column f < content_column f -> content_column f <= column ->
  column_owner column ((id, f) :: rest) = Some id.
Proof.
  intros id f rest column Hopen Hbase Hcontent.
  apply past_base_selects_innermost; [exact Hopen | lia].
Qed.

Theorem run_append : forall prefix f suffix,
  run f (prefix ++ suffix) = run (run f prefix) suffix.
Proof.
  induction prefix as [|event rest IH]; intros f suffix; simpl.
  - reflexivity.
  - apply IH.
Qed.

Theorem same_state_same_suffix : forall prefix1 prefix2 f1 f2 suffix,
  run f1 prefix1 = run f2 prefix2 ->
  run f1 (prefix1 ++ suffix) = run f2 (prefix2 ++ suffix).
Proof.
  intros prefix1 prefix2 f1 f2 suffix H.
  rewrite !run_append, H. reflexivity.
Qed.

Theorem end_input_absorbs : forall events f deepest,
  run (step f (end_input, deepest)) events = step f (end_input, deepest).
Proof.
  assert (Hclosed : forall events k base content,
    run (Frame k base content false false) events = Frame k base content false false).
  { induction events as [| [b child] rest IH]; intros k base content.
    - reflexivity.
    - destruct b; simpl; apply IH. }
  intros events [k base content c p] deepest.
  unfold step. simpl. repeat rewrite andb_false_r. apply Hclosed.
Qed.
