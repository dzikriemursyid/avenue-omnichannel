import { useState, useEffect, useCallback, useMemo } from "react";
import { contactGroupsApi } from "@/lib/api/contact-groups";
import { useApi } from "@/hooks/use-api";
import type { ContactGroup } from "@/lib/api/contact-groups";

export const useContactGroups = () => {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return contactGroupsApi.list;
  }, []);

  const { data, loading, error, execute } = useApi(apiFunction);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  useEffect(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    if (data?.data) {
      setGroups(data.data);
    } else if (Array.isArray(data)) {
      setGroups(data);
    }
  }, [data]);

  const refresh = useCallback(() => {
    execute();
  }, [execute]);

  return {
    groups,
    loading,
    error,
    refresh,
  };
};

export const useContactGroup = (id: string) => {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return contactGroupsApi.get;
  }, []);

  const { data, loading, error, execute } = useApi(apiFunction);
  const [group, setGroup] = useState<ContactGroup | null>(null);

  useEffect(() => {
    if (id) {
      execute(id);
    }
  }, [execute]);

  useEffect(() => {
    if (data) {
      setGroup(data as unknown as ContactGroup);
    }
  }, [data]);

  const refresh = useCallback(() => {
    if (id) {
      execute(id);
    }
  }, [id, execute]);

  return {
    group,
    loading,
    error,
    refresh,
  };
};

export const useContactGroupContacts = (groupId: string, params?: { search?: string; page?: number; limit?: number }) => {
  // Memoize the API function to prevent recreation on every render
  const apiFunction = useMemo(() => {
    return contactGroupsApi.getContactsByGroup;
  }, []);

  const { data, loading, error, execute } = useApi(apiFunction);
  const [contacts, setContacts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);

  // Create stable dependency values
  const searchValue = params?.search || "";
  const pageValue = params?.page || 1;
  const limitValue = params?.limit || 50;

  useEffect(() => {
    if (groupId) {
      const apiParams = {
        page: pageValue,
        limit: limitValue,
        ...(searchValue && { search: searchValue }),
      };
      execute(groupId, apiParams);
    }
  }, [execute, searchValue, pageValue, limitValue]);

  useEffect(() => {
    if (data) {
      // Handle the API response structure correctly
      const contactsData = data.contacts || [];
      const paginationData = data.pagination || null;

      setContacts(contactsData);
      setPagination(paginationData);
    } else {
      setContacts([]);
      setPagination(null);
    }
  }, [data]);

  const refresh = useCallback(() => {
    if (groupId) {
      const apiParams = {
        page: pageValue,
        limit: limitValue,
        ...(searchValue && { search: searchValue }),
      };
      execute(groupId, apiParams);
    }
  }, [groupId, execute, searchValue, pageValue, limitValue]);

  return {
    contacts,
    pagination,
    loading,
    error,
    refresh,
  };
};
