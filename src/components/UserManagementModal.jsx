import React, { useEffect, useState } from "react";
import "./UserManagementModal.css";

const ROLES = [
  ["admin", "Platform Admin"],
  ["student_coordinator", "Student Coordinator"],
  ["faculty_coordinator", "Faculty Coordinator"],
  ["hod", "HOD"],
  ["principal", "Principal"],
  ["dean", "Dean"],
];

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "",
  department: "",
  societyId: "",
};

export default function UserManagementModal({
  isOpen,
  onClose,
  token,
  currentUserId,
}) {
  const [users, setUsers] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load users.");
      setUsers(data.users || []);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setSuccessMsg("");
    Promise.all([
      loadUsers(),
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/societies`).then(
        async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.message || "Failed to load societies.");
          setSocieties(data.societies || []);
        },
      ),
    ]).catch((error) => setErrorMsg(error.message));
  }, [isOpen]);

  if (!isOpen) return null;

  const startEditing = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department || "",
      societyId: user.societyId || "",
    });
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${editingUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to update user.");
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === data.user.id ? data.user : user,
        ),
      );
      setEditingUser(null);
      setSuccessMsg("User updated successfully.");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleDelete = async (user) => {
    if (
      user.id === currentUserId ||
      !window.confirm(`Delete ${user.name}'s account?`)
    )
      return;
    setErrorMsg("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/users/${user.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to delete user.");
      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.id !== user.id),
      );
      setSuccessMsg("User deleted successfully.");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div
      className="user-management-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="user-management-container"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="user-management-header">
          <div>
            <h2>👥 Update Users</h2>
            <p>Modify or delete existing user accounts.</p>
          </div>
          <button
            className="user-management-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="user-management-error" role="alert">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="user-management-success">{successMsg}</div>
        )}

        {editingUser ? (
          <form className="user-management-form" onSubmit={handleUpdate}>
            <h3>Edit {editingUser.name}</h3>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </label>
            <label>
              New password <span>(leave blank to keep current)</span>
              <input
                type="password"
                minLength="8"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
              >
                {ROLES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Department
              <input
                value={form.department}
                onChange={(event) =>
                  setForm({ ...form, department: event.target.value })
                }
              />
            </label>
            <label>
              Society
              <select
                value={form.societyId}
                onChange={(event) =>
                  setForm({ ...form, societyId: event.target.value })
                }
              >
                <option value="">Not affiliated</option>
                {societies.map((society) => (
                  <option key={society.id} value={society.id}>
                    {society.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="user-management-form-actions">
              <button type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button type="submit">Save changes</button>
            </div>
          </form>
        ) : (
          <div className="user-management-table-wrapper">
            {isLoading ? (
              <p>Loading users...</p>
            ) : (
              <table className="user-management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Society</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        {ROLES.find(([value]) => value === user.role)?.[1] ||
                          user.role}
                      </td>
                      <td>{user.department}</td>
                      <td>
                        {societies.find(
                          (society) => society.id === user.societyId,
                        )?.name || "—"}
                      </td>
                      <td className="user-management-actions">
                        <button
                          onClick={() => startEditing(user)}
                          aria-label={`Edit ${user.name}`}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          aria-label={`Delete ${user.name}`}
                          title="Delete"
                          disabled={user.id === currentUserId}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
