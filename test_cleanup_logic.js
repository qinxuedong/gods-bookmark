
// Mock data
const bookmarks = [
    {
        category: "TestCat",
        items: [
            { url: "http://test.com", name: "Test" }
        ]
    },
    {
        category: "OtherCat",
        items: [
            { url: "http://other.com", name: "Other" },
            { url: "http://stay.com", name: "Stay" }
        ]
    }
];

console.log("Initial state:", JSON.stringify(bookmarks, null, 2));

// Simulate Delete Request: Delete http://test.com from TestCat
const category = "TestCat";
const bookmarkUrl = "http://test.com";

console.log(`\nDeleting ${bookmarkUrl} from ${category}...`);

// Logic copied from server.js (approximate structure)
let removed = false;

if (category) {
    const categoryIndex = bookmarks.findIndex(cat => cat.category === category);
    if (categoryIndex >= 0) {
        const categoryItems = bookmarks[categoryIndex].items;
        const itemIndex = categoryItems.findIndex(item => item.url === bookmarkUrl);

        if (itemIndex >= 0) {
            categoryItems.splice(itemIndex, 1);
            removed = true;
            console.log('✓ 删除书签成功');

            // The Logic I Added:
            if (categoryItems.length === 0) {
                bookmarks.splice(categoryIndex, 1);
                console.log('Category is empty, removed category:', category);
            }
        }
    }
}

console.log("\nFinal state:", JSON.stringify(bookmarks, null, 2));

// Verification
const testCatExists = bookmarks.find(cat => cat.category === "TestCat");
if (!testCatExists) {
    console.log("\nPASS: TestCat was removed.");
} else {
    console.error("\nFAIL: TestCat still exists!");
    process.exit(1);
}

const otherCat = bookmarks.find(cat => cat.category === "OtherCat");
if (otherCat && otherCat.items.length === 2) {
    console.log("PASS: OtherCat remains untouched.");
} else {
    console.error("FAIL: OtherCat impacted.");
    process.exit(1);
}
