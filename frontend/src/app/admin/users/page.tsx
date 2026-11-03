"use client";

import { AdminOnly, AdminTitle, useAdmin } from "@/components/admin/shell";
import { UsersTable } from "@/components/admin/users-table";

export default function UsersPage() {
  const { me } = useAdmin();
  return (
    <AdminOnly>
      <AdminTitle
        title="Users"
        lead="Members contribute; reviewers verify others' contributions; admins manage everything. You cannot change your own role."
      />
      <UsersTable me={me} />
    </AdminOnly>
  );
}
