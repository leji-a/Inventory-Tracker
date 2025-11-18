// models/category/service.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { CategoryInput, CategoryOutput } from "./schema"
import type { PaginationParams, PaginatedResponse } from "../../types/types"
import {
	NotFoundError,
	ValidationError,
	UnauthorizedError,
} from "../../lib/errors"

export async function getAllCategories(
	supabase: SupabaseClient,
	{ page = 1, limit = 20 }: PaginationParams = {},
): Promise<PaginatedResponse<CategoryOutput>> {
	// Validate pagination params
	if (page < 1) page = 1;
	if (limit < 1) limit = 20;
	if (limit > 100) limit = 100;

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	// Get total count
	const { count, error: countError } = await supabase
		.from("categories")
		.select("*", { count: "exact", head: true });

	if (countError) throw countError;

	const total = count ?? 0;
	const totalPages = Math.ceil(total / limit);

	// Get paginated data
	const { data, error } = await supabase
		.from("categories")
		.select("id, name, description, owner_id, created_at, updated_at")
		.order("id")
		.range(from, to);

	if (error) throw error;

	return {
		data: data as CategoryOutput[],
		pagination: {
			page,
			limit,
			total,
			totalPages,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1,
		},
	};
}

export async function getCategoryById(
	supabase: SupabaseClient,
	id: number,
): Promise<CategoryOutput> {
	if (isNaN(id) || id <= 0) throw new ValidationError("Invalid category ID");

	const { data, error } = await supabase
		.from("categories")
		.select("id, name, description, owner_id, created_at, updated_at")
		.eq("id", id)
		.single();

	if (error) throw error;
	if (!data) throw new NotFoundError("Category not found");
	return data as CategoryOutput;
}

export async function createCategory(
	supabase: SupabaseClient,
	category: CategoryInput,
): Promise<CategoryOutput> {
	// Add owner_id
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new UnauthorizedError();

	const { data, error } = await supabase
		.from("categories")
		.insert({ ...category, owner_id: user.id })
		.select("id, name, description, owner_id, created_at, updated_at")
		.single();

	if (error) throw error;
	return data as CategoryOutput;
}

export async function updateCategory(
	supabase: SupabaseClient,
	id: number,
	category: Partial<CategoryInput>,
): Promise<CategoryOutput> {
	if (isNaN(id) || id <= 0) throw new ValidationError("Invalid category ID");

	const { data, error } = await supabase
		.from("categories")
		.update(category)
		.eq("id", id)
		.select("id, name, description, owner_id, created_at, updated_at")
		.single();

	if (error) throw error;
	if (!data) throw new NotFoundError("Category not found");
	return data as CategoryOutput;
}

export async function deleteCategory(
	supabase: SupabaseClient,
	id: number,
): Promise<void> {
	if (isNaN(id) || id <= 0) throw new ValidationError("Invalid category ID");

	const { error } = await supabase.from("categories").delete().eq("id", id);
	if (error) throw error;
}

